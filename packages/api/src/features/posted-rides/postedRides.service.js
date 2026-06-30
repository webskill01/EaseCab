'use strict';

const {
  AppError, ERROR_CODES, POSTED_RIDES, POSTED_RIDE_STATUS, CONTACT_RATE_LIMIT,
  hasSubmittedKyc, isSubscriptionActive, CONTACT_SOURCE,
} = require('@easecab/shared');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');

const TTL_MS = POSTED_RIDES.TTL_HOURS * 3600_000;

/**
 * Client-safe projection of a posted ride. Defence-in-depth: the repo select
 * already omits `phone`, but this whitelist guarantees it. `fare` (Prisma Decimal)
 * is coerced to a number for JSON. §3.10.
 * @param {object} p
 */
function toPublicPostedRide(p) {
  return {
    id: p.id,
    // Poster identity for the verified-card profile link (T3-2 feed entry point).
    posterId: p.postedBy ?? null,
    posterName: p.poster?.name ?? null,
    posterBaseCity: p.poster?.baseCity ?? null,
    verifiedDriver: Boolean(p.poster && p.poster.aadhaarVerified && p.poster.dlSubmitted && p.poster.rcSubmitted),
    fromCityId: p.fromCityId ?? null,
    toCityId: p.toCityId ?? null,
    fromCityRaw: p.fromCityRaw ?? null,
    toCityRaw: p.toCityRaw ?? null,
    fromCityName: p.fromCity?.canonicalName ?? null,
    toCityName: p.toCity?.canonicalName ?? null,
    // Localized names for the feed (#10); null → client falls back to canonical.
    fromCityNamePa: p.fromCity?.namePa ?? null,
    fromCityNameHi: p.fromCity?.nameHi ?? null,
    toCityNamePa: p.toCity?.namePa ?? null,
    toCityNameHi: p.toCity?.nameHi ?? null,
    vehicleType: p.vehicleType ?? null,
    fare: p.fare === null || p.fare === undefined ? null : Number(p.fare),
    rideDate: p.rideDate ?? null,
    rideTime: p.rideTime ?? null,
    notes: p.notes ?? null,
    status: p.status,
    isClosed: p.isClosed,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
  };
}

/**
 * Posted-rides business logic (CLAUDE.md §4). Create is verification-gated (≥1 KYC
 * doc); contact is subscription-gated (mirrors bot-rides reveal). The opaque cursor
 * codec is shared with bot rides — its `receivedAt` field carries our createdAt key.
 *
 * @param {object} deps
 * @param {ReturnType<import('./postedRides.repository').createPostedRidesRepository>} deps.repo
 * @param {import('pino').Logger} [deps.logger] - used only to log a best-effort
 *   push-publish failure on create; test harnesses may omit it.
 * @param {{ verifyUpload: Function }} [deps.uploads] - R2 verify gate (report screenshots)
 */
function createPostedRidesService({ repo, logger, uploads }) {
  return {
    /** Create a 24h post behind the KYC soft gate, validating any picked cityIds. */
    async createPost(userId, input) {
      const flags = await repo.getUserKycFlags(userId);
      if (!hasSubmittedKyc(flags)) {
        throw AppError.fromCode(ERROR_CODES.VERIFICATION_REQUIRED);
      }
      const ids = [input.fromCityId, input.toCityId].filter(Boolean);
      if (ids.length > 0) {
        const existing = await repo.findExistingCityIds(ids);
        if (ids.some((id) => !existing.has(id))) {
          throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
        }
      }
      const expiresAt = new Date(Date.now() + TTL_MS);
      const row = await repo.createPost({ postedBy: userId, ...input, expiresAt });
      // Fire-and-forget: tell the push dispatcher a new post landed so it can notify
      // users who opted into these cities. A publish failure must not fail the create.
      try {
        await repo.publishCreated({ id: row.id, fromCityId: row.fromCityId, toCityId: row.toCityId });
      } catch (err) {
        // The post is persisted; the live push is best-effort and must not fail the
        // user's create. Log it (CLAUDE.md §4 — never swallow silently).
        logger?.warn({ err: err.message, postedRideId: row.id }, 'posted ride created but push publish failed');
      }
      return toPublicPostedRide(row);
    },

    /** One page of the public posted-rides feed, newest first. */
    async listFeed({ limit, cursor, cityIds }) {
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listActivePosts({ createdAt: key.receivedAt, id: key.id, cityIds, limit });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      const nextCursor = hasMore ? encodeCursor({ receivedAt: last.createdAt, id: last.id }) : null;
      return { posts: page.map(toPublicPostedRide), nextCursor };
    },

    /** The caller's own posts (My Rides → posted tab), each with its chat count (P12-3). */
    async listMine(userId) {
      const rows = await repo.listMyPosts({ userId, limit: POSTED_RIDES.MINE_LIMIT });
      return { posts: rows.map((p) => ({ ...toPublicPostedRide(p), chatCount: p._count?.chats ?? 0 })) };
    },

    /**
     * Reveal a poster's phone at the contact action point. Order: 404 if no active
     * target → own-post shortcut (no gate) → subscription gate → rate limit → reveal.
     * The reveal writes no history — peeking at a number must not fill the Contacted
     * tab; the row lands only when the user taps Call/WhatsApp (logContactPost).
     */
    async contactPost({ userId, postedRideId }) {
      const post = await repo.findContactTarget(postedRideId);
      if (!post) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      if (post.postedBy === userId) {
        return { phoneNumber: post.phone };
      }
      const sub = await repo.findSubscriptionByUserId(userId);
      if (!isSubscriptionActive(sub)) {
        throw AppError.fromCode(ERROR_CODES.SUBSCRIPTION_EXPIRED);
      }
      const count = await repo.incrementContactCount(userId, CONTACT_RATE_LIMIT.WINDOW_SEC);
      if (count > CONTACT_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      return { phoneNumber: post.phone };
    },

    /**
     * Record an actual contact (user tapped Call/WhatsApp) on a verified post into
     * the Contacted tab. No re-gate / no rate-limit burn (the reveal already did),
     * leaks no phone. Own-post taps record nothing — you don't "contact" yourself.
     * 404s if the post closed between peek and tap. Idempotent via the upsert.
     *
     * @param {{ userId: string, postedRideId: string }} args
     * @returns {Promise<{ contactedAt: Date|null }>}
     */
    async logContactPost({ userId, postedRideId }) {
      const post = await repo.findContactTarget(postedRideId);
      if (!post) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      if (post.postedBy === userId) {
        return { contactedAt: null };
      }
      const snapshot = {
        source: CONTACT_SOURCE.POSTED,
        fromCityName: post.fromCity?.canonicalName ?? post.fromCityRaw ?? null,
        toCityName: post.toCity?.canonicalName ?? post.toCityRaw ?? null,
        vehicleType: post.vehicleType ?? null,
        revealedPhone: post.phone,
        posterId: post.postedBy ?? null, // backs the Contacted card's profile link
        posterName: post.poster?.name ?? null,
      };
      return repo.recordContact(userId, postedRideId, snapshot);
    },

    /** Owner marks a post done. NOT_FOUND if they don't own it / it isn't active. */
    async closePost({ userId, postedRideId }) {
      const count = await repo.closePost(postedRideId, userId);
      if (count === 0) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      return { id: postedRideId, status: POSTED_RIDE_STATUS.DONE };
    },

    /** Owner soft-deletes a post. NOT_FOUND if they don't own it. */
    async removePost({ userId, postedRideId }) {
      const count = await repo.softDeletePost(postedRideId, userId);
      if (count === 0) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      return { id: postedRideId, status: POSTED_RIDE_STATUS.DELETED };
    },

    /**
     * File a user report against a posted ride. 404 if the post is gone (before the
     * write); otherwise persists the report for the admin moderation queue (24c).
     *
     * @param {{ userId: string, postedRideId: string, reason: string, remarks?: string, screenshotKey?: string }} args
     * @returns {Promise<{ id: string, createdAt: Date }>}
     */
    async reportPost({ userId, postedRideId, reason, remarks, screenshotKey }) {
      const post = await repo.findPostExists(postedRideId);
      if (!post) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      // You can't report your own post (§6 — authorization at the action point).
      if (post.postedBy === userId) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      }
      const storedKey = screenshotKey
        ? (await uploads.verifyUpload({ userId, purpose: 'report_screenshot', key: screenshotKey })).key
        : null;
      return repo.createPostReport({ reporterId: userId, postedRideId, reason, remarks, screenshotKey: storedKey });
    },
  };
}

module.exports = { createPostedRidesService, toPublicPostedRide };

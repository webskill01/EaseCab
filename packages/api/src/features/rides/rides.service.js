'use strict';

const { AppError, ERROR_CODES, CONTACT_RATE_LIMIT, isSubscriptionActive, CONTACT_SOURCE } = require('@easecab/shared');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');

/**
 * Reduce a ride to the client-safe shape. Defence-in-depth: the repository select
 * already excludes phoneNumber/rawText, but this whitelist guarantees the masked
 * shape even if a caller passes a fuller row (e.g. the SSE re-fetch). §3.10.
 * @param {object} r - a ride row
 * @returns {object}
 */
function toPublicRide(r) {
  return {
    id: r.id,
    displayText: r.displayText,
    pickupCityId: r.pickupCityId ?? null,
    dropCityId: r.dropCityId ?? null,
    pickupRaw: r.pickupRaw ?? null,
    dropRaw: r.dropRaw ?? null,
    // Clean resolved name (joined relation); null when the fragment never resolved.
    pickupCityName: r.pickupCity?.canonicalName ?? null,
    dropCityName: r.dropCity?.canonicalName ?? null,
    // Localized names for the feed (#10); null → client falls back to canonical.
    pickupCityNamePa: r.pickupCity?.namePa ?? null,
    pickupCityNameHi: r.pickupCity?.nameHi ?? null,
    dropCityNamePa: r.dropCity?.namePa ?? null,
    dropCityNameHi: r.dropCity?.nameHi ?? null,
    vehicleType: r.vehicleType ?? null,
    status: r.status,
    receivedAt: r.receivedAt,
    expiresAt: r.expiresAt,
  };
}

/**
 * Rides business logic (CLAUDE.md §4 service layer).
 * @param {object} deps
 * @param {ReturnType<import('./rides.repository').createRidesRepository>} deps.repo
 * @param {{ verifyUpload: Function }} [deps.uploads] - R2 verify gate (report screenshots)
 */
function createRidesService({ repo, uploads }) {
  return {
    /**
     * One page of the live feed, newest first. Decodes the opaque cursor (a bad one
     * throws VALIDATION_ERROR), fetches limit+1 to learn whether more remain, and
     * emits the next cursor only when there is a further page.
     *
     * @param {{ limit: number, cursor?: string, cityId?: string }} query
     * @returns {Promise<{ rides: object[], nextCursor: ?string }>}
     */
    async listFeed({ limit, cursor, cityId }) {
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listVisibleRides({ ...key, cityId, limit });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      const nextCursor = hasMore ? encodeCursor({ receivedAt: last.receivedAt, id: last.id }) : null;
      return { rides: page.map(toPublicRide), nextCursor };
    },

    /**
     * Reveal a ride's phone at the contact action point, behind the soft gate.
     * Order matters: 404 if the ride is gone (before consulting the subscription),
     * then the gate, then record + reveal. Idempotent via the repo upsert.
     *
     * @param {{ userId: string, rideId: string }} args
     * @returns {Promise<{ phoneNumber: string, contactedAt: Date }>}
     */
    async contactRide({ userId, rideId }) {
      const ride = await repo.findRideContactTarget(rideId);
      if (!ride) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const sub = await repo.findSubscriptionByUserId(userId);
      if (!isSubscriptionActive(sub)) {
        throw AppError.fromCode(ERROR_CODES.SUBSCRIPTION_EXPIRED);
      }
      // Throttle reveals so a subscribed account can't enumerate every ride's phone
      // (security-review H1). Counted on the reveal path only — gated/404 calls leak
      // no phone, so they don't burn the budget.
      const count = await repo.incrementContactCount(userId, CONTACT_RATE_LIMIT.WINDOW_SEC);
      if (count > CONTACT_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const snapshot = {
        source: CONTACT_SOURCE.BOT,
        fromCityName: ride.pickupCity?.canonicalName ?? ride.pickupRaw ?? null,
        toCityName: ride.dropCity?.canonicalName ?? ride.dropRaw ?? null,
        vehicleType: ride.vehicleType ?? null,
        revealedPhone: ride.phoneNumber,
      };
      const { contactedAt } = await repo.recordContact(userId, rideId, snapshot);
      return { phoneNumber: ride.phoneNumber, contactedAt };
    },

    /**
     * File a user report against a bot ride. 404 if the ride is gone (before the
     * write); otherwise persists the report for the admin moderation queue (24c).
     *
     * @param {{ userId: string, rideId: string, reason: string, remarks?: string, screenshotKey?: string }} args
     * @returns {Promise<{ id: string, createdAt: Date }>}
     */
    async reportRide({ userId, rideId, reason, remarks, screenshotKey }) {
      const ride = await repo.findRideExists(rideId);
      if (!ride) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const screenshotUrl = screenshotKey
        ? (await uploads.verifyUpload({ userId, purpose: 'report_screenshot', key: screenshotKey })).key
        : null;
      return repo.createRideReport({ reporterId: userId, rideId, reason, remarks, screenshotUrl });
    },
  };
}

module.exports = { createRidesService, toPublicRide, isSubscriptionActive };

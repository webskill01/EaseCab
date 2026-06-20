'use strict';

const { RIDE_STATUS, redisKey } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');
const { getCachedSub, setCachedSub } = require('../../lib/subscriptionCache');

/**
 * The ONLY columns of a bot ride that may reach a client (CLAUDE.md §3.10 + the
 * rides.raw_text exposure boundary). `phoneNumber` and `rawText` are deliberately
 * absent — the contact endpoint is the sole phone reveal, after the soft gate.
 */
const PUBLIC_RIDE_SELECT = Object.freeze({
  id: true,
  displayText: true,
  pickupCityId: true,
  dropCityId: true,
  pickupRaw: true,
  dropRaw: true,
  // Join just the canonical name of each resolved city so the feed can render a
  // clean "Ludhiana → Delhi" instead of the messy raw fragment. Null when the
  // string never resolved (SetNull relation) — the raw fragment is the fallback.
  pickupCity: { select: { canonicalName: true, namePa: true, nameHi: true } },
  dropCity: { select: { canonicalName: true, namePa: true, nameHi: true } },
  vehicleType: true,
  status: true,
  receivedAt: true,
  expiresAt: true,
});

/** Statuses that appear in the live feed (hidden rides have aged out, §12 TTL). */
const VISIBLE_STATUSES = Object.freeze([RIDE_STATUS.FRESH, RIDE_STATUS.BOOKED]);

/**
 * Rides data access (CLAUDE.md §4 repository layer — DB only, no business logic).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis - for the contact-reveal rate limit
 */
function createRidesRepository({ prisma, redis }) {
  const contactCountKey = (userId) => redisKey('contact', userId);

  return {
    /**
     * Increment a user's contact-reveal counter in an atomic fixed window — same
     * shared limiter as the OTP gate (security-review H1/H3). Returns the new count.
     */
    async incrementContactCount(userId, windowSec) {
      return fixedWindowIncr(redis, contactCountKey(userId), windowSec);
    },

    /**
     * One keyset page of visible rides, newest first, masked to the public select.
     * Fetches `limit + 1` rows so the service can detect whether a next page exists
     * without a second COUNT query. Cursor (when present) excludes everything at or
     * before `(receivedAt, id)` in the `(receivedAt DESC, id DESC)` ordering.
     *
     * @param {object} args
     * @param {Date} [args.receivedAt] - cursor key (omit for the first page)
     * @param {string} [args.id] - cursor key (omit for the first page)
     * @param {string} [args.cityId] - live city-filter lock; keep only rides whose
     *   PICKUP city equals this (SCREENS §2). Omit for the unfiltered feed.
     * @param {number} args.limit - page size (the +1 is added here)
     * @returns {Promise<object[]>} up to limit+1 public ride rows
     */
    async listVisibleRides({ receivedAt, id, cityId, limit }) {
      const where = {
        status: { in: VISIBLE_STATUSES },
        expiresAt: { gt: new Date() },
      };
      // Live city lock = match the PICKUP city only (drivers filter by where the
      // ride starts, SCREENS §2). Flat field, so it ANDs with the cursor cleanly.
      if (cityId) where.pickupCityId = cityId;
      // Strict "older than the cursor" in (receivedAt DESC, id DESC) order.
      if (receivedAt && id) {
        where.OR = [{ receivedAt: { lt: receivedAt } }, { receivedAt, id: { lt: id } }];
      }
      return prisma.ride.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: PUBLIC_RIDE_SELECT,
      });
    },

    /** Public projection of a single ride by id — used by the SSE fanout. null if gone. */
    async findPublicRideById(id) {
      return prisma.ride.findUnique({ where: { id }, select: PUBLIC_RIDE_SELECT });
    },

    /**
     * Existence + the data a reveal needs: unmasked phone PLUS the snapshot fields
     * (route names, vehicle) persisted onto the contact row (Step 19). null if gone.
     */
    async findRideContactTarget(id) {
      return prisma.ride.findUnique({
        where: { id },
        select: {
          id: true, phoneNumber: true, vehicleType: true,
          pickupRaw: true, dropRaw: true,
          pickupCity: { select: { canonicalName: true } },
          dropCity: { select: { canonicalName: true } },
        },
      });
    },

    /** The caller's subscription window for the soft gate — cache-first (§15). null if none. */
    async findSubscriptionByUserId(userId) {
      const cached = await getCachedSub(redis, userId);
      if (cached) return cached;
      const sub = await prisma.subscription.findUnique({
        where: { userId },
        select: { status: true, trialExpiresAt: true, expiresAt: true },
      });
      await setCachedSub(redis, userId, sub);
      return sub;
    },

    /**
     * Idempotently record (or refresh) a contact on (userId, rideId), writing the
     * Step-19 snapshot so the row renders after the ride hard-deletes. contactedAt is
     * NOT in `update`, so a re-tap preserves the original first-contact time.
     */
    async recordContact(userId, rideId, snapshot) {
      return prisma.rideContact.upsert({
        where: { userId_rideId: { userId, rideId } },
        create: { userId, rideId, ...snapshot },
        update: { ...snapshot },
        select: { contactedAt: true },
      });
    },

    /** Existence check for the report path — null if the ride is gone. */
    async findRideExists(id) {
      return prisma.ride.findUnique({ where: { id }, select: { id: true } });
    },

    /** Write a user report against a bot ride (feeds the admin moderation queue, 24c). */
    async createRideReport({ reporterId, rideId, reason, remarks, screenshotUrl }) {
      return prisma.rideReport.create({
        data: { reporterId, rideId, reason, remarks: remarks ?? null, screenshotUrl: screenshotUrl ?? null },
        select: { id: true, createdAt: true },
      });
    },
  };
}

module.exports = { createRidesRepository, PUBLIC_RIDE_SELECT };

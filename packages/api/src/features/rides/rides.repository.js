'use strict';

const { RIDE_STATUS, redisKey } = require('@easecab/shared');

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
     * Increment a user's contact-reveal counter and (re)assert the window expiry on
     * every call — the same self-healing pattern as the OTP gate (auth.repository),
     * so an orphaned key can never permanently block a user. Returns the new count.
     */
    async incrementContactCount(userId, windowSec) {
      const key = contactCountKey(userId);
      const count = await redis.incr(key);
      await redis.expire(key, windowSec);
      return count;
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
     * @param {number} args.limit - page size (the +1 is added here)
     * @returns {Promise<object[]>} up to limit+1 public ride rows
     */
    async listVisibleRides({ receivedAt, id, limit }) {
      const where = {
        status: { in: VISIBLE_STATUSES },
        expiresAt: { gt: new Date() },
      };
      if (receivedAt && id) {
        // Strict "older than the cursor" in (receivedAt DESC, id DESC) order.
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
     * Existence + the unmasked phone for a contact reveal. Returns only what the
     * reveal needs (id + phoneNumber); null if the ride row is gone (hard-deleted).
     */
    async findRideContactTarget(id) {
      return prisma.ride.findUnique({ where: { id }, select: { id: true, phoneNumber: true } });
    },

    /** The caller's subscription window fields for the soft gate. null if none. */
    async findSubscriptionByUserId(userId) {
      return prisma.subscription.findUnique({
        where: { userId },
        select: { status: true, trialExpiresAt: true, expiresAt: true },
      });
    },

    /**
     * Idempotently record that a user contacted a ride. The (userId, rideId) unique
     * constraint makes a re-tap a no-op update (so the phone can be re-revealed
     * without a duplicate-key 500). Returns the contact's timestamp.
     */
    async recordContact(userId, rideId) {
      return prisma.rideContact.upsert({
        where: { userId_rideId: { userId, rideId } },
        create: { userId, rideId },
        update: {},
        select: { contactedAt: true },
      });
    },
  };
}

module.exports = { createRidesRepository, PUBLIC_RIDE_SELECT };

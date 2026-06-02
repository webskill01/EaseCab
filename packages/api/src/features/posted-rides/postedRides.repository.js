'use strict';

const { POSTED_RIDE_STATUS, redisKey } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');
const { getCachedSub, setCachedSub } = require('../../lib/subscriptionCache');

/** Columns of a posted ride that may reach a client — never `phone` (§3.10). */
const POSTED_PUBLIC_SELECT = Object.freeze({
  id: true,
  fromCityId: true,
  toCityId: true,
  fromCityRaw: true,
  toCityRaw: true,
  vehicleType: true,
  fare: true,
  rideDate: true,
  rideTime: true,
  notes: true,
  status: true,
  isClosed: true,
  createdAt: true,
  expiresAt: true,
});

/** "HH:MM" -> a 1970-epoch Date so Prisma stores it in the @db.Time(6) column. */
function toTime(hhmm) {
  return hhmm ? new Date(`1970-01-01T${hhmm}:00.000Z`) : null;
}

/**
 * Posted-rides data access (CLAUDE.md §4 — Prisma + Redis only). Shares the
 * contact-reveal Redis counter key (`contact:<userId>`) with the bot-rides repo so
 * a user's total phone reveals are capped across both feeds.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createPostedRidesRepository({ prisma, redis }) {
  const contactCountKey = (userId) => redisKey('contact', userId);

  return {
    /** The poster's KYC flags for the create soft gate. null if the user is gone. */
    async getUserKycFlags(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true },
      });
    },

    /** Which of the given city ids exist + are active. Returns a Set for O(1) checks. */
    async findExistingCityIds(ids) {
      const rows = await prisma.city.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });
      return new Set(rows.map((r) => r.id));
    },

    /** Insert a post. rideDate is already a Date (coerced); rideTime is "HH:MM". */
    async createPost(input) {
      return prisma.postedRide.create({
        data: {
          postedBy: input.postedBy,
          fromCityId: input.fromCityId ?? null,
          toCityId: input.toCityId ?? null,
          fromCityRaw: input.fromCityRaw ?? null,
          toCityRaw: input.toCityRaw ?? null,
          vehicleType: input.vehicleType ?? null,
          fare: input.fare ?? null,
          rideDate: input.rideDate ?? null,
          rideTime: toTime(input.rideTime),
          phone: input.phone,
          notes: input.notes ?? null,
          expiresAt: input.expiresAt,
        },
        select: POSTED_PUBLIC_SELECT,
      });
    },

    /**
     * One keyset page of active, unexpired posts, newest first. Fetches limit+1 so
     * the service can detect a further page. Cursor excludes everything at/before
     * (createdAt, id) in (createdAt DESC, id DESC) order.
     */
    async listActivePosts({ createdAt, id, limit }) {
      const where = { status: POSTED_RIDE_STATUS.ACTIVE, expiresAt: { gt: new Date() } };
      if (createdAt && id) {
        where.OR = [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }];
      }
      return prisma.postedRide.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: POSTED_PUBLIC_SELECT,
      });
    },

    /** The caller's own posts (any status except deleted), newest first, capped. */
    async listMyPosts({ userId, limit }) {
      return prisma.postedRide.findMany({
        where: { postedBy: userId, status: { not: POSTED_RIDE_STATUS.DELETED } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        select: POSTED_PUBLIC_SELECT,
      });
    },

    /** Existence + unmasked phone + owner for a contact reveal; null if gone/closed/expired. */
    async findContactTarget(id) {
      return prisma.postedRide.findFirst({
        where: { id, status: POSTED_RIDE_STATUS.ACTIVE, expiresAt: { gt: new Date() } },
        select: { id: true, phone: true, postedBy: true },
      });
    },

    /** Cache-first subscription window for the contact soft gate (§15). null if none. */
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

    /** Shared contact-reveal counter (same key as bot rides) — atomic fixed window. */
    async incrementContactCount(userId, windowSec) {
      return fixedWindowIncr(redis, contactCountKey(userId), windowSec);
    },

    /** Idempotently record a contact on (userId, postedRideId). Re-tap = no-op update. */
    async recordContact(userId, postedRideId) {
      return prisma.rideContact.upsert({
        where: { userId_postedRideId: { userId, postedRideId } },
        create: { userId, postedRideId },
        update: {},
        select: { contactedAt: true },
      });
    },

    /** Owner closes an active post → done. Scoped to owner+active so non-owners get count 0. */
    async closePost(id, userId) {
      const { count } = await prisma.postedRide.updateMany({
        where: { id, postedBy: userId, status: POSTED_RIDE_STATUS.ACTIVE },
        data: { status: POSTED_RIDE_STATUS.DONE, isClosed: true },
      });
      return count;
    },

    /** Owner soft-deletes a post (any non-deleted status) → deleted. count 0 if not owner. */
    async softDeletePost(id, userId) {
      const { count } = await prisma.postedRide.updateMany({
        where: { id, postedBy: userId, status: { not: POSTED_RIDE_STATUS.DELETED } },
        data: { status: POSTED_RIDE_STATUS.DELETED, isClosed: true },
      });
      return count;
    },
  };
}

module.exports = { createPostedRidesRepository, POSTED_PUBLIC_SELECT };

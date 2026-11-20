'use strict';

const { RIDE_STATUS, POSTED_RIDE_STATUS } = require('@easecab/shared');
const { getCachedSub, setCachedSub } = require('../../lib/subscriptionCache');
const { PUBLIC_RIDE_SELECT } = require('../rides/rides.repository');
const { POSTED_PUBLIC_SELECT } = require('../posted-rides/postedRides.repository');

const VISIBLE = [RIDE_STATUS.FRESH, RIDE_STATUS.BOOKED];
const CITY_SELECT = { id: true, canonicalName: true, namePa: true, nameHi: true };

/** Same visibility rule as the bot feed, + optional pickup-city lock and keyset cursor. */
function rideWhere({ cityIds, receivedAt, id }) {
  const where = { status: { in: VISIBLE }, expiresAt: { gt: new Date() } };
  if (cityIds && cityIds.length > 0) where.pickupCityId = { in: cityIds };
  if (receivedAt && id) where.OR = [{ receivedAt: { lt: receivedAt } }, { receivedAt, id: { lt: id } }];
  return where;
}

/** Driver duties incl. done ones (shown greyed), poster not auto-flagged. */
function dutyWhere({ cityIds, createdAt, id }) {
  const where = {
    status: { in: [POSTED_RIDE_STATUS.ACTIVE, POSTED_RIDE_STATUS.DONE] },
    expiresAt: { gt: new Date() },
    poster: { flaggedAt: null },
  };
  if (cityIds && cityIds.length > 0) where.fromCityId = { in: cityIds };
  if (createdAt && id) where.OR = [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }];
  return where;
}

/**
 * Group Mode data access (CLAUDE.md §4 — DB/cache only). The open feeds select the
 * phone + original text on purpose: every caller is subscription-gated in the service.
 * @param {{ prisma: import('@prisma/client').PrismaClient, redis: import('ioredis').Redis }} deps
 */
function createGroupModeRepository({ prisma, redis }) {
  return {
    /** @returns {Promise<?{enabled: boolean, cityIds: string[]}>} stored settings, null = never set */
    async getSettings(userId) {
      return (await prisma.user.findUnique({ where: { id: userId }, select: { groupMode: true } }))?.groupMode ?? null;
    },

    async saveSettings(userId, value) {
      await prisma.user.update({ where: { id: userId }, data: { groupMode: value }, select: { id: true } });
    },

    /** Active cities by id (any order). */
    async citiesByIds(ids) {
      return prisma.city.findMany({ where: { id: { in: ids }, isActive: true }, select: CITY_SELECT });
    },

    /** Active cities by canonical name (the default groups). */
    async citiesByNames(names) {
      return prisma.city.findMany({ where: { canonicalName: { in: names }, isActive: true }, select: CITY_SELECT });
    },

    /** Cache-first subscription window for the paywall (§15). null if none. */
    async findSubscription(userId) {
      const cached = await getCachedSub(redis, userId);
      if (cached) return cached;
      const sub = await prisma.subscription.findUnique({ where: { userId }, select: { status: true, expiresAt: true } });
      await setCachedSub(redis, userId, sub);
      return sub;
    },

    /** One keyset page (limit+1) of bot rides WITH original text + phone, newest first. */
    async listOpenRides({ cityIds, receivedAt, id, limit }) {
      return prisma.ride.findMany({
        where: rideWhere({ cityIds, receivedAt, id }),
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: { ...PUBLIC_RIDE_SELECT, rawText: true, phoneNumber: true },
      });
    },

    /** One keyset page (limit+1) of driver duties WITH phone, newest first. */
    async listOpenDuties({ cityIds, createdAt, id, limit }) {
      return prisma.postedRide.findMany({
        where: dutyWhere({ cityIds, createdAt, id }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: { ...POSTED_PUBLIC_SELECT, phone: true },
      });
    },

    /**
     * Per city group: unread (rides after that group's `since`) + newest ride time.
     * One aggregate over rides joined to the requested (city, since) pairs.
     * @param {{ cityId: string, since: Date }[]} groups
     * @returns {Promise<{ key: string, unread: number, lastAt: ?Date }[]>}
     */
    async rideGroupStats(groups) {
      if (groups.length === 0) return [];
      return prisma.$queryRaw`
        SELECT g.key::text AS key,
               (count(r.id) FILTER (WHERE r.received_at > g.since))::int AS unread,
               max(r.received_at) AS "lastAt"
        FROM unnest(${groups.map((x) => x.cityId)}::uuid[], ${groups.map((x) => x.since.toISOString())}::timestamptz[]) AS g(key, since)
        LEFT JOIN rides r ON r.pickup_city_id = g.key AND r.status::text = ANY(${VISIBLE}) AND r.expires_at > now()
        GROUP BY g.key`;
    },

    /** Newest visible ride's text per pickup city. @returns {Promise<{ key: string, text: string }[]>} */
    async latestRideTexts(cityIds) {
      if (cityIds.length === 0) return [];
      return prisma.$queryRaw`
        SELECT DISTINCT ON (pickup_city_id) pickup_city_id::text AS key, raw_text AS text
        FROM rides
        WHERE pickup_city_id = ANY(${cityIds}::uuid[]) AND status::text = ANY(${VISIBLE}) AND expires_at > now()
        ORDER BY pickup_city_id, received_at DESC`;
    },

    /** The "all rides" group: unread after `since` + newest ride. */
    async allRidesStat(since) {
      const [unread, last] = await Promise.all([
        prisma.ride.count({ where: { ...rideWhere({}), receivedAt: { gt: since } } }),
        prisma.ride.findFirst({ where: rideWhere({}), orderBy: { receivedAt: 'desc' }, select: { rawText: true, receivedAt: true } }),
      ]);
      return { unread, last };
    },

    /** Every visible duty, light columns (a handful at any time) for the summary. */
    async visibleDuties() {
      return prisma.postedRide.findMany({
        where: dutyWhere({}),
        orderBy: { createdAt: 'desc' },
        select: {
          fromCityId: true, createdAt: true, fromCityRaw: true, toCityRaw: true,
          fromCity: { select: { canonicalName: true } }, toCity: { select: { canonicalName: true } },
        },
      });
    },
  };
}

module.exports = { createGroupModeRepository };

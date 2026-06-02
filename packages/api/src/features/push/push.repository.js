'use strict';

const { PUSH_SOURCE } = require('@easecab/shared');

/** Maps a push source to the per-user toggle column that gates it. */
const SOURCE_TOGGLE = Object.freeze({
  [PUSH_SOURCE.BOT]: 'notifyBotRides',
  [PUSH_SOURCE.POSTED]: 'notifyPostedRides',
});

/**
 * Push data access (CLAUDE.md §4 — Prisma only). Token registration is idempotent
 * on the (userId, deviceToken) unique; the targeting query joins push tokens to the
 * opted-in cities + per-source toggle on the user. notification_cities holds City
 * UUIDs and is served by a GIN index (the `hasSome` array-overlap, db-review H1).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createPushRepository({ prisma }) {
  return {
    /** Upsert a device token for the user; idempotent on (userId, deviceToken). */
    async registerToken({ userId, deviceToken, platform }) {
      return prisma.pushSubscription.upsert({
        where: { userId_deviceToken: { userId, deviceToken } },
        create: { userId, deviceToken, platform },
        update: { platform, lastSeenAt: new Date() },
        select: { id: true, platform: true, createdAt: true },
      });
    },

    /** Remove a device token for the user. Returns the deleted count (0 if absent). */
    async removeToken({ userId, deviceToken }) {
      const { count } = await prisma.pushSubscription.deleteMany({ where: { userId, deviceToken } });
      return count;
    },

    /** Which of the given city ids exist + are active (preferences validation). Set for O(1). */
    async findExistingCityIds(ids) {
      const rows = await prisma.city.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });
      return new Set(rows.map((r) => r.id));
    },

    /** The user's notification preferences. null if the user is gone. */
    async getPreferences(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { notificationCities: true, notifyBotRides: true, notifyPostedRides: true },
      });
    },

    /** Apply a partial preferences update; returns the new preferences. */
    async updatePreferences(userId, data) {
      return prisma.user.update({
        where: { id: userId },
        data,
        select: { notificationCities: true, notifyBotRides: true, notifyPostedRides: true },
      });
    },

    /**
     * Distinct device tokens to notify for a new ride: tokens of users who (a) opted
     * into at least one of the ride's cities, (b) have the source toggle on, and
     * (c) aren't soft-deleted. One push per device (DISTINCT) — a multi-device user
     * is notified on each device. Empty city list → no targets.
     */
    async findTargetTokens({ cityIds, source }) {
      if (!cityIds.length) return [];
      const toggle = SOURCE_TOGGLE[source];
      if (!toggle) return [];
      const rows = await prisma.pushSubscription.findMany({
        where: {
          user: { isDeleted: false, notificationCities: { hasSome: cityIds }, [toggle]: true },
        },
        select: { deviceToken: true },
        distinct: ['deviceToken'],
      });
      return rows.map((r) => r.deviceToken);
    },

    /** Prune tokens FCM reported as permanently invalid. Returns the deleted count. */
    async pruneTokens(tokens) {
      if (!tokens.length) return 0;
      const { count } = await prisma.pushSubscription.deleteMany({ where: { deviceToken: { in: tokens } } });
      return count;
    },
  };
}

module.exports = { createPushRepository, SOURCE_TOGGLE };

'use strict';

const { PUSH_SOURCE, RENEWAL_REMINDER, SUBSCRIPTION_STATUS } = require('@easecab/shared');

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
 * @param {import('ioredis').Redis} [deps.redis] - only the renewal-reminder dedupe uses it
 */
function createPushRepository({ prisma, redis }) {
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

    /** Resolve stored city ids to `{id,name}` for the settings UI (Step 21d). */
    async listCitiesByIds(ids) {
      const rows = await prisma.city.findMany({ where: { id: { in: ids } }, select: { id: true, canonicalName: true } });
      return rows.map((r) => ({ id: r.id, name: r.canonicalName }));
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

    /**
     * Device tokens of paid-active members whose window ends in (from, to] — the renewal
     * reminder candidates (Phase 21.3). One row per device; the service groups by user.
     * Served by the subscriptions.expires_at index.
     */
    async findRenewalDueTokens({ from, to }) {
      const rows = await prisma.pushSubscription.findMany({
        where: {
          user: {
            isDeleted: false,
            subscription: { status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt: { gt: from, lte: to } },
          },
        },
        select: { userId: true, deviceToken: true, user: { select: { subscription: { select: { expiresAt: true } } } } },
      });
      return rows.map((r) => ({ userId: r.userId, deviceToken: r.deviceToken, expiresAt: r.user.subscription.expiresAt }));
    },

    /**
     * Claim the one reminder for this user's current paid period (Redis SET NX). Keyed by
     * expiresAt, so a renewal (new expiry) is a new period. Returns true if this call won.
     * ponytail: Redis-only dedupe — a Redis flush inside the window could re-send once;
     * move to a DB column if that ever matters.
     */
    async claimRenewalReminder({ userId, expiresAt }) {
      const key = `${RENEWAL_REMINDER.DEDUPE_KEY_PREFIX}${userId}:${expiresAt.toISOString()}`;
      return (await redis.set(key, '1', 'EX', RENEWAL_REMINDER.DEDUPE_TTL_SEC, 'NX')) === 'OK';
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

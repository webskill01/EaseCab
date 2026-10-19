'use strict';

const { redisKey, PAYMENT_STATUS, SUBSCRIPTION_STATUS } = require('@easecab/shared');
const { delCachedSub } = require('../../lib/subscriptionCache');
const { fixedWindowIncr } = require('../../lib/rateLimit');

const CAPTURED = Object.freeze({ where: { status: PAYMENT_STATUS.CAPTURED } });
// A referee "paid" once any captured ₹149 is theirs — self-paid or a linked founder payment.
const HAS_PAID = Object.freeze({
  OR: [{ payments: { some: CAPTURED.where } }, { paymentsOnBehalf: { some: CAPTURED.where } }],
});

/**
 * Referral data access (Prisma + Redis only). referred_by_id lives on the referee;
 * referral_rewarded_at marks a paid referee already spent on a free month.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createReferralsRepository({ prisma, redis }) {
  return {
    /** Atomic per-user claim counter (stops probing which numbers have accounts). */
    async incrClaimAttempts(userId, windowSec) {
      return fixedWindowIncr(redis, redisKey('referral-claim', userId), windowSec);
    },

    /** The caller's phone (rollout gate), signup time + current referrer (null if none). */
    async findClaimant(userId) {
      return prisma.user.findUnique({ where: { id: userId }, select: { id: true, phone: true, createdAt: true, referredById: true } });
    },

    /** Live (not deleted) user by full phone. */
    async findUserByPhone(phone) {
      return prisma.user.findFirst({ where: { phone, isDeleted: false }, select: { id: true, name: true } });
    },

    /** Set the referrer only if none is set yet. @returns {Promise<boolean>} false if already set. */
    async setReferrer({ userId, referrerId }) {
      const { count } = await prisma.user.updateMany({ where: { id: userId, referredById: null }, data: { referredById: referrerId } });
      return count === 1;
    },

    /** Who referred this user (id) — null if nobody. */
    async findReferrerId(userId) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } });
      return u ? u.referredById : null;
    },

    /** Paid referees not yet spent on a reward, oldest signup first. Served by users.referred_by_id. */
    async listUnrewardedPaidReferees(referrerId) {
      const rows = await prisma.user.findMany({
        where: { referredById: referrerId, referralRewardedAt: null, ...HAS_PAID },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    },

    /** Uncached subscription read for the stacking math. */
    async findSubscription(userId) {
      return prisma.subscription.findUnique({ where: { userId }, select: { status: true, expiresAt: true, paidStartedAt: true } });
    },

    /**
     * Atomically spend these referees and extend the referrer's plan. The conditional
     * updateMany is the race guard: if a concurrent reward already spent any of them,
     * the count is short and the whole tx rolls back. @returns {Promise<boolean>}
     */
    async grantReward({ referrerId, refereeIds, newExpiresAt, paidStartedAt }) {
      try {
        await prisma.$transaction(async (tx) => {
          const { count } = await tx.user.updateMany({
            where: { id: { in: refereeIds }, referredById: referrerId, referralRewardedAt: null },
            data: { referralRewardedAt: new Date() },
          });
          if (count !== refereeIds.length) throw new Error('referral_race');
          const data = { status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt: newExpiresAt, paidStartedAt };
          await tx.subscription.upsert({ where: { userId: referrerId }, update: data, create: { userId: referrerId, ...data } });
        });
        return true;
      } catch (err) {
        if (err && err.message === 'referral_race') return false;
        throw err;
      }
    },

    /** Drop the cached subscription so the new expiry shows immediately. */
    async invalidateSubCache(userId) {
      await delCachedSub(redis, userId);
    },

    /** The user's push device tokens (reward notification). */
    async listDeviceTokens(userId) {
      const rows = await prisma.pushSubscription.findMany({ where: { userId }, select: { deviceToken: true } });
      return rows.map((r) => r.deviceToken);
    },

    /** The caller's referees (newest first, capped) with paid counts, + who referred the caller. */
    async listReferrals(userId, limit) {
      const [rows, me] = await prisma.$transaction([
        prisma.user.findMany({
          where: { referredById: userId, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true, name: true, createdAt: true, referralRewardedAt: true,
            _count: { select: { payments: CAPTURED, paymentsOnBehalf: CAPTURED } },
          },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { phone: true, createdAt: true, referredBy: { select: { name: true } } } }),
      ]);
      return { rows, me };
    },
  };
}

module.exports = { createReferralsRepository };

'use strict';

const { redisKey, RAZORPAY, PAYMENT_STATUS, SUBSCRIPTION_STATUS } = require('@easecab/shared');
const { getCachedSub, setCachedSub, delCachedSub } = require('../../lib/subscriptionCache');

/**
 * Subscription/payment data access (CLAUDE.md §4 — DB + cache only, no business
 * decisions). The stacking math + signature checks live in the service.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createSubscriptionRepository({ prisma, redis }) {
  const lockKey = (paymentId) => redisKey('pay', paymentId);

  return {
    /**
     * Best-effort per-payment dedupe lock (fast path). SET NX with a TTL that
     * outlives Razorpay's retry window. Returns true if WE acquired it (caller may
     * proceed), false if it already existed (treat as a duplicate). The DB UNIQUE on
     * razorpay_payment_id is the hard guarantee behind this.
     * @returns {Promise<boolean>}
     */
    async acquirePaymentLock(paymentId) {
      const res = await redis.set(lockKey(paymentId), '1', 'EX', RAZORPAY.PAYMENT_LOCK_TTL_SEC, 'NX');
      return res === 'OK';
    },

    /** Newest unpaid (`created`) order for a user, or null — the reusable open order. */
    async findOpenOrder(userId) {
      return prisma.payment.findFirst({
        where: { userId, status: PAYMENT_STATUS.CREATED },
        orderBy: { createdAt: 'desc' },
        select: { id: true, razorpayOrderId: true, amount: true },
      });
    },

    /** Persist a freshly-created Razorpay order as a `created` payment row. */
    async createOrderRecord({ userId, razorpayOrderId, amount }) {
      return prisma.payment.create({
        data: { userId, razorpayOrderId, amount, status: PAYMENT_STATUS.CREATED },
        select: { id: true, razorpayOrderId: true, amount: true },
      });
    },

    /** The order's owner + amount (resolves userId for the webhook path). null if unknown. */
    async findOrderRecord(razorpayOrderId) {
      return prisma.payment.findUnique({
        where: { razorpayOrderId },
        select: { userId: true, amount: true },
      });
    },

    /** Uncached subscription read for the credit path (needs paidStartedAt; must be fresh). */
    async findSubscriptionForCredit(userId) {
      return prisma.subscription.findUnique({
        where: { userId },
        select: { status: true, trialExpiresAt: true, expiresAt: true, paidStartedAt: true },
      });
    },

    /**
     * Atomically: flip the `created` order row → `captured` (or create a captured row
     * if the webhook beat /checkout), and extend the subscription. The UNIQUE on
     * razorpay_payment_id makes a duplicate credit throw P2002 inside the tx → the
     * whole tx (incl. the subscription extension) rolls back → {duplicate:true}.
     * @returns {Promise<{ duplicate: boolean }>}
     */
    async recordCaptureAndExtend({ userId, razorpayOrderId, razorpayPaymentId, amount, newExpiresAt, paidStartedAt }) {
      try {
        await prisma.$transaction(async (tx) => {
          const updated = await tx.payment.updateMany({
            where: { razorpayOrderId, status: PAYMENT_STATUS.CREATED },
            data: { razorpayPaymentId, status: PAYMENT_STATUS.CAPTURED },
          });
          if (updated.count === 0) {
            // No open order row (webhook-first, or a duplicate where the row is already
            // captured). Create a captured row; a duplicate paymentId trips the UNIQUE.
            await tx.payment.create({
              data: { userId, razorpayOrderId, razorpayPaymentId, amount, status: PAYMENT_STATUS.CAPTURED },
            });
          }
          await tx.subscription.update({
            where: { userId },
            data: { status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt: newExpiresAt, paidStartedAt },
          });
        });
        return { duplicate: false };
      } catch (err) {
        if (err && err.code === 'P2002') return { duplicate: true };
        throw err;
      }
    },

    /** Cache-first subscription snapshot for GET /me (§15). */
    async getSubscriptionCached(userId) {
      const cached = await getCachedSub(redis, userId);
      if (cached) return cached;
      const sub = await prisma.subscription.findUnique({
        where: { userId },
        select: { status: true, trialExpiresAt: true, expiresAt: true },
      });
      await setCachedSub(redis, userId, sub);
      return sub;
    },

    /** Invalidate the cached snapshot (called after every credit). */
    async invalidateSubCache(userId) {
      await delCachedSub(redis, userId);
    },
  };
}

module.exports = { createSubscriptionRepository };

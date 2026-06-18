'use strict';

const {
  AppError,
  ERROR_CODES,
  SUBSCRIPTION_PLAN,
  RAZORPAY,
  CHECKOUT_RATE_LIMIT,
  isSubscriptionActive,
  computeRenewal,
} = require('@easecab/shared');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../../lib/razorpaySignature');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');

/** Client-safe payment-history row. `paidAt` = capture time (updatedAt). */
function toPublicPayment(p) {
  return { id: p.id, amount: p.amount, status: p.status, paymentId: p.razorpayPaymentId ?? null, paidAt: p.updatedAt };
}

/**
 * Subscription business logic (CLAUDE.md §4). Razorpay is injected (vendor boundary);
 * HMAC checks use our pure lib. /verify and /webhook both funnel into creditPayment,
 * which is idempotent (Redis lock fast-path + the repo's UNIQUE-guarded credit tx).
 *
 * @param {object} deps
 * @param {ReturnType<import('./subscription.repository').createSubscriptionRepository>} deps.repo
 * @param {{ createOrder(args): Promise<{ id: string }> }} deps.razorpay
 * @param {{ razorpay: { keyId: string, keySecret: string, webhookSecret: string } }} deps.config
 */
function createSubscriptionService({ repo, razorpay, config }) {
  const { keyId, keySecret, webhookSecret, stub } = config.razorpay;

  /** Shared idempotent credit path. Resolves the user from the stored order record. */
  async function creditPayment({ orderId, paymentId }) {
    const acquired = await repo.acquirePaymentLock(paymentId);
    if (!acquired) return { credited: false, reason: 'duplicate' };

    const order = await repo.findOrderRecord(orderId);
    if (!order) return { credited: false, reason: 'unknown_order' };

    const sub = await repo.findSubscriptionForCredit(order.userId);
    const { newExpiresAt, paidStartedAt } = computeRenewal(sub);
    const { duplicate } = await repo.recordCaptureAndExtend({
      userId: order.userId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amount: order.amount,
      newExpiresAt,
      paidStartedAt,
    });
    if (duplicate) return { credited: false, reason: 'duplicate' };

    await repo.invalidateSubCache(order.userId);
    return { credited: true };
  }

  return {
    /** Idempotent checkout — reuse the user's open order, else create one (anti double-charge). */
    async createCheckout(userId) {
      const attempts = await repo.incrCheckoutAttempts(userId, CHECKOUT_RATE_LIMIT.WINDOW_SEC);
      if (attempts > CHECKOUT_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const open = await repo.findOpenOrder(userId);
      if (open) {
        return { orderId: open.razorpayOrderId, amount: open.amount, currency: SUBSCRIPTION_PLAN.CURRENCY, keyId };
      }
      const order = await razorpay.createOrder({
        amount: SUBSCRIPTION_PLAN.PRICE_PAISE,
        currency: SUBSCRIPTION_PLAN.CURRENCY,
        receipt: `sub_${userId}_${Date.now()}`,
      });
      await repo.createOrderRecord({ userId, razorpayOrderId: order.id, amount: SUBSCRIPTION_PLAN.PRICE_PAISE });
      return { orderId: order.id, amount: SUBSCRIPTION_PLAN.PRICE_PAISE, currency: SUBSCRIPTION_PLAN.CURRENCY, keyId };
    },

    /** Client callback (instant UX). HMAC-verify then credit. */
    async verifyPayment({ orderId, paymentId, signature }) {
      // stub demo mode (RAZORPAY_STUB=true, never production — server.js FATALs):
      // the stub gateway emits no real HMAC, so skip verification and credit directly.
      if (!stub && !verifyPaymentSignature({ orderId, paymentId, signature, keySecret })) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      }
      return creditPayment({ orderId, paymentId });
    },

    /** Razorpay webhook (durable backstop). Verify raw-body HMAC, then credit on capture. */
    async handleWebhook({ rawBody, signature }) {
      // stub demo mode: skip the raw-body HMAC check (no real webhook secret in play).
      if (!stub && !verifyWebhookSignature({ rawBody, signature, webhookSecret })) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      }
      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      }
      if (body.event !== RAZORPAY.EVENT_PAYMENT_CAPTURED) {
        return { credited: false, reason: 'ignored_event' };
      }
      const entity = body.payload && body.payload.payment && body.payload.payment.entity;
      if (!entity || !entity.id || !entity.order_id) {
        return { credited: false, reason: 'malformed' };
      }
      return creditPayment({ orderId: entity.order_id, paymentId: entity.id });
    },

    /** Cached subscription snapshot + computed isActive for the membership UI. */
    async getStatus(userId) {
      const sub = await repo.getSubscriptionCached(userId);
      return {
        status: sub ? sub.status : null,
        trialExpiresAt: sub ? sub.trialExpiresAt : null,
        expiresAt: sub ? sub.expiresAt : null,
        isActive: isSubscriptionActive(sub),
      };
    },

    /**
     * Payment-history page for the membership screen (Step 21d). The shared cursor
     * codec's `receivedAt` slot carries our `updatedAt` keyset (me/contacted does the same).
     */
    async listPayments({ userId, limit, cursor }) {
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listCapturedPayments({ userId, updatedAt: key.receivedAt, id: key.id, limit });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      const nextCursor = hasMore ? encodeCursor({ receivedAt: last.updatedAt, id: last.id }) : null;
      return { payments: page.map(toPublicPayment), nextCursor };
    },
  };
}

module.exports = { createSubscriptionService, toPublicPayment };

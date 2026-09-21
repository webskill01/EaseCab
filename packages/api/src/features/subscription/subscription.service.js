'use strict';

const {
  AppError,
  ERROR_CODES,
  SUBSCRIPTION_PLAN,
  CASHFREE,
  CHECKOUT_RATE_LIMIT,
  VERIFY_RATE_LIMIT,
  WEBHOOK_RATE_LIMIT,
  PAYMENT_RECONCILE,
  isSubscriptionActive,
  computeRenewal,
} = require('@easecab/shared');
const crypto = require('node:crypto');
const { verifyWebhookSignature } = require('../../lib/cashfreeSignature');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');

/** Client-safe payment-history row. `paidAt` = capture time (updatedAt). */
function toPublicPayment(p) {
  return { id: p.id, amount: p.amount, status: p.status, paymentId: p.razorpayPaymentId ?? null, paidAt: p.updatedAt };
}

/**
 * Subscription business logic (CLAUDE.md §4). Cashfree is injected (vendor boundary,
 * Phase 16.1). /verify and /webhook both funnel into creditPayment, which is idempotent
 * (Redis lock fast-path + the repo's UNIQUE-guarded credit tx).
 *
 * ponytail: Cashfree ids are stored in the legacy razorpay_order_id / razorpay_payment_id
 * columns — no rename migration yet; rename when a schema change touches payments anyway.
 *
 * @param {object} deps
 * @param {ReturnType<import('./subscription.repository').createSubscriptionRepository>} deps.repo
 * @param {ReturnType<import('../../lib/cashfree').createCashfreeClient>} deps.cashfree
 * @param {{ cashfree: { secretKey: string, env: 'sandbox'|'production', stub?: boolean } }} deps.config
 */
function createSubscriptionService({ repo, cashfree, config }) {
  const { secretKey, stub, env } = config.cashfree;

  /** Shared idempotent credit path for an already-verified payment on a known order. */
  async function creditPayment({ order, orderId, paymentId }) {
    const acquired = await repo.acquirePaymentLock(paymentId);
    if (!acquired) return { credited: false, reason: 'duplicate' };

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

  /**
   * THE only way money becomes membership: ask Cashfree (never the browser, never the
   * webhook body) whether the order is paid, check the amount matches what we charged,
   * then credit idempotently. /verify, the webhook, checkout self-heal and the
   * reconcile sweep all funnel through here.
   */
  async function settleFromGateway(orderId, order) {
    const found = order || (await repo.findOrderRecord(orderId));
    if (!found) return { credited: false, reason: 'unknown_order' };
    const state = await cashfree.getPaymentState(orderId);
    if (state.state === 'pending') return { credited: false, reason: 'pending' };
    if (state.state !== 'paid') return { credited: false, reason: 'not_paid' };
    if (Math.round(state.amountRupees * 100) !== found.amount) {
      // Impossible for orders we create server-side. If it ever happens, refuse and surface
      // it: 500 is logged by the global handler, and Cashfree retries the webhook.
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, `payment amount mismatch on ${orderId}`, 500);
    }
    return creditPayment({ order: found, orderId, paymentId: state.paymentId });
  }

  return {
    /** Idempotent checkout — reuse the user's still-payable order, else create one (anti double-charge). */
    async createCheckout(userId) {
      const attempts = await repo.incrCheckoutAttempts(userId, CHECKOUT_RATE_LIMIT.WINDOW_SEC);
      if (attempts > CHECKOUT_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const amount = SUBSCRIPTION_PLAN.PRICE_PAISE;
      const open = await repo.findOpenOrder(userId);
      if (open) {
        const session = await cashfree.getActiveSession(open.razorpayOrderId);
        if (session) return { orderId: open.razorpayOrderId, paymentSessionId: session, amount: open.amount, mode: env };
        // Paid but not yet credited (user refreshed mid-checkout, webhook still in flight):
        // credit it now instead of opening a second order the user could pay twice.
        const settled = await settleFromGateway(open.razorpayOrderId, { userId, amount: open.amount });
        if (settled.credited || settled.reason === 'duplicate') return { alreadyPaid: true };
        // Expired unpaid — leave the row `created`; the new order becomes the open one.
      }
      const phone = await repo.findUserPhone(userId);
      // Cashfree order_id: [A-Za-z0-9_-], max 45 chars → "sub_" + 32 hex.
      const order = await cashfree.createOrder({
        orderId: `sub_${crypto.randomUUID().replace(/-/g, '')}`,
        amountRupees: amount / 100,
        customerId: userId,
        customerPhone: phone.slice(-10),
      });
      await repo.createOrderRecord({ userId, razorpayOrderId: order.id, amount });
      return { orderId: order.id, paymentSessionId: order.paymentSessionId, amount, mode: env };
    },

    /**
     * Post-checkout callback (instant UX). Owner-scoped so one user can't probe another
     * user's order, and rate-limited because each call is a Cashfree round-trip.
     */
    async verifyPayment({ userId, orderId }) {
      const attempts = await repo.incrVerifyAttempts(userId, VERIFY_RATE_LIMIT.WINDOW_SEC);
      if (attempts > VERIFY_RATE_LIMIT.MAX_PER_WINDOW) throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      const order = await repo.findOrderRecord(orderId);
      if (!order || order.userId !== userId) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      return settleFromGateway(orderId, order);
    },

    /**
     * Cashfree webhook (durable backstop). The HMAC proves Cashfree sent it; the body is
     * then used ONLY for the order id — the payment itself is re-fetched (Cashfree's own
     * guidance: re-verify before fulfilling; also covers a leaked secret).
     */
    async handleWebhook({ ip, rawBody, timestamp, signature }) {
      const attempts = await repo.incrWebhookAttempts(ip, WEBHOOK_RATE_LIMIT.WINDOW_SEC);
      if (attempts > WEBHOOK_RATE_LIMIT.MAX_PER_WINDOW) throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      // stub demo mode: skip the HMAC check (no real secret in play). Never production.
      if (!stub && !verifyWebhookSignature({ rawBody, timestamp, signature, secretKey })) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      }
      let body;
      try {
        body = JSON.parse(rawBody.toString('utf8'));
      } catch {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      }
      if (body.type !== CASHFREE.EVENT_PAYMENT_SUCCESS) {
        return { credited: false, reason: 'ignored_event' };
      }
      const orderId = body.data && body.data.order && body.data.order.order_id;
      if (typeof orderId !== 'string' || !orderId) return { credited: false, reason: 'malformed' };
      return settleFromGateway(orderId);
    },

    /**
     * Reconciliation sweep: credit recent orders that were paid but never confirmed
     * (webhook lost AND the user never came back).
     * ponytail: re-polls every abandoned order in the window each pass (at most BATCH
     * calls); add a last-checked-at column if checkout volume makes that noisy.
     * @returns {Promise<number>} how many were credited this pass
     */
    async reconcileOpenOrders() {
      const since = new Date(Date.now() - PAYMENT_RECONCILE.LOOKBACK_HOURS * 3_600_000);
      const orders = await repo.listRecentOpenOrders(since, PAYMENT_RECONCILE.BATCH);
      let credited = 0;
      for (const o of orders) {
        const res = await settleFromGateway(o.razorpayOrderId, o);
        if (res.credited) credited += 1;
      }
      return credited;
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

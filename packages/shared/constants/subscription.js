'use strict';

/**
 * Subscription plan economics — single source of truth (CLAUDE.md §5, no magic
 * numbers). ₹149 stored in paise because Razorpay amounts are integer paise.
 */
const SUBSCRIPTION_PLAN = Object.freeze({
  PRICE_PAISE: 14900,
  PERIOD_DAYS: 30,
  CURRENCY: 'INR',
});

/** `payments.status` lifecycle (plain string column, not a Prisma enum). */
const PAYMENT_STATUS = Object.freeze({
  CREATED: 'created', // order created at /checkout, not yet paid
  CAPTURED: 'captured', // payment succeeded + credited
  FAILED: 'failed', // reserved for a future failed-payment webhook
});

/** Razorpay integration constants. */
const RAZORPAY = Object.freeze({
  EVENT_PAYMENT_CAPTURED: 'payment.captured',
  // Per-payment Redis dedupe lock; must outlive Razorpay's ~24h retry window. The
  // DB UNIQUE on razorpay_payment_id is the hard guarantee — this is the fast path.
  PAYMENT_LOCK_TTL_SEC: 60 * 60 * 24 * 3, // 3 days
  // Subscription-status cache TTL (CLAUDE.md §15 — 5 min, invalidate on write).
  SUB_CACHE_TTL_SEC: 300,
});

/**
 * /checkout abuse cap (security-review H2, 2026-06-02). The idempotent open-order
 * reuse stops duplicate orders, but not a tight loop hammering Razorpay's
 * create-order API; this fixed window bounds it per authed user.
 */
const CHECKOUT_RATE_LIMIT = Object.freeze({ MAX_PER_WINDOW: 5, WINDOW_SEC: 60 });

/** Payment-history list pagination bounds (GET /subscription/payments, Step 21d). */
const PAYMENTS = Object.freeze({ PAGE_LIMIT_DEFAULT: 20, PAGE_LIMIT_MAX: 50 });

module.exports = { SUBSCRIPTION_PLAN, PAYMENT_STATUS, RAZORPAY, CHECKOUT_RATE_LIMIT, PAYMENTS };

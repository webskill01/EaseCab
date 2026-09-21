'use strict';

/**
 * Subscription plan economics — single source of truth (CLAUDE.md §5, no magic
 * numbers). ₹149 stored in paise (DB column is integer paise); Cashfree takes rupees, so
 * convert at the vendor boundary only.
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

/** Cashfree PG integration constants (Phase 16.1 — replaced Razorpay). */
const CASHFREE = Object.freeze({
  API_VERSION: '2025-01-01',
  BASE_URL: Object.freeze({
    sandbox: 'https://sandbox.cashfree.com/pg',
    production: 'https://api.cashfree.com/pg',
  }),
  EVENT_PAYMENT_SUCCESS: 'PAYMENT_SUCCESS_WEBHOOK',
  ORDER_ACTIVE: 'ACTIVE',
  PAYMENT_SUCCESS: 'SUCCESS',
  PAYMENT_PENDING: 'PENDING',
  // Outbound call budget (Cashfree go-live checklist: 5–10s timeouts on every API call).
  HTTP_TIMEOUT_MS: 10_000,
  // Per-payment Redis dedupe lock; must outlive the gateway's webhook retry window. The
  // DB UNIQUE on the payment id is the hard guarantee — this is the fast path.
  PAYMENT_LOCK_TTL_SEC: 60 * 60 * 24 * 3, // 3 days
  // Subscription-status cache TTL (CLAUDE.md §15 — 5 min, invalidate on write).
  SUB_CACHE_TTL_SEC: 300,
});

/**
 * /checkout abuse cap (security-review H2, 2026-06-02). The idempotent open-order
 * reuse stops duplicate orders, but not a tight loop hammering the gateway's
 * create-order API; this fixed window bounds it per authed user.
 */
const CHECKOUT_RATE_LIMIT = Object.freeze({ MAX_PER_WINDOW: 5, WINDOW_SEC: 60 });

/** /verify cap — every call is a Cashfree API round-trip, so bound it per user too. */
const VERIFY_RATE_LIMIT = Object.freeze({ MAX_PER_WINDOW: 20, WINDOW_SEC: 60 });

/**
 * Public webhook cap per source IP (security-review 2026-09-22 M1), checked BEFORE the
 * HMAC so junk floods can't burn CPU or Cashfree API calls. Generous: real Cashfree
 * traffic is one event per payment plus at most 3 retries.
 */
const WEBHOOK_RATE_LIMIT = Object.freeze({ MAX_PER_WINDOW: 60, WINDOW_SEC: 60 });

/**
 * Payment reconciliation sweep (API process). Re-checks recent still-`created` orders
 * with Cashfree and credits any that were paid but never confirmed (webhook lost AND
 * user never came back). Idempotent, so overlapping sweeps are harmless.
 */
const PAYMENT_RECONCILE = Object.freeze({
  INTERVAL_MS: 15 * 60 * 1000,
  LOOKBACK_HOURS: 48,
  BATCH: 50,
});

/** Payment-history list pagination bounds (GET /subscription/payments, Step 21d). */
const PAYMENTS = Object.freeze({ PAGE_LIMIT_DEFAULT: 20, PAGE_LIMIT_MAX: 50 });

module.exports = {
  SUBSCRIPTION_PLAN, PAYMENT_STATUS, CASHFREE, CHECKOUT_RATE_LIMIT, VERIFY_RATE_LIMIT, WEBHOOK_RATE_LIMIT, PAYMENT_RECONCILE, PAYMENTS,
};

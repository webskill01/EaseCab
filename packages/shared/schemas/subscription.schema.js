'use strict';

const { z } = require('zod');
const { PAYMENTS, PLAN_ID } = require('../constants/subscription');

/**
 * Post-checkout verify body (CLAUDE.md §5). Only the order id — the service re-fetches
 * the order's payments from Cashfree; nothing the browser sends is trusted as proof.
 * Charset/length match Cashfree's order_id rules.
 */
const verifyPaymentSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{1,45}$/),
});

/**
 * Checkout body — which prepaid plan to buy. The server owns the price; the body carries
 * only the plan id. Missing body/plan = monthly (older clients send no body).
 */
const checkoutSchema = z.preprocess((body) => body ?? {}, z.object({
  plan: z.enum(Object.values(PLAN_ID)).default(PLAN_ID.M1),
}));

/** Payment-history query — cursor keyset pagination (GET /subscription/payments, Step 21d). */
const paymentsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAYMENTS.PAGE_LIMIT_MAX).default(PAYMENTS.PAGE_LIMIT_DEFAULT),
  cursor: z.string().min(1).optional(),
});

module.exports = { checkoutSchema, verifyPaymentSchema, paymentsListQuerySchema };

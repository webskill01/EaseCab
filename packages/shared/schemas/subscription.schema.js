'use strict';

const { z } = require('zod');
const { PAYMENTS } = require('../constants/subscription');

/**
 * Razorpay client-callback verify body (CLAUDE.md §5). Razorpay returns these three
 * after the checkout popup succeeds; the service HMAC-checks them before crediting.
 */
const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

/** Payment-history query — cursor keyset pagination (GET /subscription/payments, Step 21d). */
const paymentsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAYMENTS.PAGE_LIMIT_MAX).default(PAYMENTS.PAGE_LIMIT_DEFAULT),
  cursor: z.string().min(1).optional(),
});

module.exports = { verifyPaymentSchema, paymentsListQuerySchema };

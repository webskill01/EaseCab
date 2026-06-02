'use strict';

const { z } = require('zod');

/**
 * Razorpay client-callback verify body (CLAUDE.md §5). Razorpay returns these three
 * after the checkout popup succeeds; the service HMAC-checks them before crediting.
 */
const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

module.exports = { verifyPaymentSchema };

'use strict';

const crypto = require('node:crypto');

/**
 * Constant-time compare of two hex signatures. Returns false (never throws) on any
 * length mismatch or bad input so callers can branch to VALIDATION_ERROR.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Verify the Razorpay client-callback signature: HMAC-SHA256(orderId|paymentId) with
 * the API KEY SECRET (CLAUDE.md §7 — verify before any processing).
 * @param {{ orderId: string, paymentId: string, signature: string, keySecret: string }} args
 * @returns {boolean}
 */
function verifyPaymentSignature({ orderId, paymentId, signature, keySecret }) {
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/**
 * Verify the Razorpay webhook signature: HMAC-SHA256(rawBody) with the WEBHOOK SECRET.
 * `rawBody` MUST be the exact bytes Razorpay sent (a Buffer) — never a re-serialized
 * JSON object, or the digest won't match.
 * @param {{ rawBody: Buffer, signature: string, webhookSecret: string }} args
 * @returns {boolean}
 */
function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

module.exports = { verifyPaymentSignature, verifyWebhookSignature };

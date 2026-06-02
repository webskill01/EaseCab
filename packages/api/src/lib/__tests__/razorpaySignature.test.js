'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../razorpaySignature');

const KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';

function sign(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

test('verifyPaymentSignature accepts a valid signature, rejects a forged one', () => {
  const orderId = 'order_1';
  const paymentId = 'pay_1';
  const good = sign(KEY_SECRET, `${orderId}|${paymentId}`);
  assert.strictEqual(verifyPaymentSignature({ orderId, paymentId, signature: good, keySecret: KEY_SECRET }), true);
  assert.strictEqual(verifyPaymentSignature({ orderId, paymentId, signature: 'deadbeef', keySecret: KEY_SECRET }), false);
});

test('verifyWebhookSignature accepts valid, rejects tampered body', () => {
  const raw = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
  const good = sign(WEBHOOK_SECRET, raw);
  assert.strictEqual(verifyWebhookSignature({ rawBody: raw, signature: good, webhookSecret: WEBHOOK_SECRET }), true);
  assert.strictEqual(verifyWebhookSignature({ rawBody: Buffer.from('{}'), signature: good, webhookSecret: WEBHOOK_SECRET }), false);
});

test('rejects a missing/empty signature without throwing', () => {
  assert.strictEqual(verifyWebhookSignature({ rawBody: Buffer.from('{}'), signature: undefined, webhookSecret: WEBHOOK_SECRET }), false);
});

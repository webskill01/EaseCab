'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { verifyWebhookSignature } = require('../cashfreeSignature');

const secretKey = 'cf_secret_key_16chars';
const rawBody = Buffer.from('{"type":"PAYMENT_SUCCESS_WEBHOOK"}');
const timestamp = '1726900000';
const good = crypto.createHmac('sha256', secretKey).update(timestamp + rawBody.toString()).digest('base64');

test('accepts base64(HMAC(timestamp + rawBody)) with the secret key', () => {
  assert.strictEqual(verifyWebhookSignature({ rawBody, timestamp, signature: good, secretKey }), true);
});

test('rejects a Razorpay-style hex digest over the body alone', () => {
  const hex = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex');
  assert.strictEqual(verifyWebhookSignature({ rawBody, timestamp, signature: hex, secretKey }), false);
});

test('rejects a tampered body, a wrong timestamp, or missing headers', () => {
  assert.strictEqual(verifyWebhookSignature({ rawBody: Buffer.from('{}'), timestamp, signature: good, secretKey }), false);
  assert.strictEqual(verifyWebhookSignature({ rawBody, timestamp: '1', signature: good, secretKey }), false);
  assert.strictEqual(verifyWebhookSignature({ rawBody, timestamp: undefined, signature: good, secretKey }), false);
  assert.strictEqual(verifyWebhookSignature({ rawBody, timestamp, signature: undefined, secretKey }), false);
});

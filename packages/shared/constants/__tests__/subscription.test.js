'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { SUBSCRIPTION_PLAN, PAYMENT_STATUS, RAZORPAY, PAYMENTS } = require('../subscription');

test('plan is ₹149 (paise), 30-day period, INR', () => {
  assert.strictEqual(SUBSCRIPTION_PLAN.PRICE_PAISE, 14900);
  assert.strictEqual(SUBSCRIPTION_PLAN.PERIOD_DAYS, 30);
  assert.strictEqual(SUBSCRIPTION_PLAN.CURRENCY, 'INR');
});

test('payment status values are frozen', () => {
  assert.deepStrictEqual(
    { ...PAYMENT_STATUS },
    { CREATED: 'created', CAPTURED: 'captured', FAILED: 'failed' },
  );
  assert.ok(Object.isFrozen(PAYMENT_STATUS));
});

test('razorpay webhook event + lock ttl present', () => {
  assert.strictEqual(RAZORPAY.EVENT_PAYMENT_CAPTURED, 'payment.captured');
  assert.ok(RAZORPAY.PAYMENT_LOCK_TTL_SEC > 86_400); // outlives the retry window
});

test('PAYMENTS page-limit bounds are frozen + sane', () => {
  assert.ok(PAYMENTS.PAGE_LIMIT_DEFAULT >= 1);
  assert.ok(PAYMENTS.PAGE_LIMIT_MAX >= PAYMENTS.PAGE_LIMIT_DEFAULT);
  assert.ok(Object.isFrozen(PAYMENTS));
});

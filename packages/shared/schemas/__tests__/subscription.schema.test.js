'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { verifyPaymentSchema } = require('../subscription.schema');

test('accepts a well-formed verify body', () => {
  const r = verifyPaymentSchema.safeParse({ orderId: 'order_x', paymentId: 'pay_x', signature: 'abc' });
  assert.ok(r.success);
});

test('rejects a missing field', () => {
  const r = verifyPaymentSchema.safeParse({ orderId: 'order_x', paymentId: 'pay_x' });
  assert.strictEqual(r.success, false);
});

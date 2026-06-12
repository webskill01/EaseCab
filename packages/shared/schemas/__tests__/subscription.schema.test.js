'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { verifyPaymentSchema, paymentsListQuerySchema } = require('../subscription.schema');

test('accepts a well-formed verify body', () => {
  const r = verifyPaymentSchema.safeParse({ orderId: 'order_x', paymentId: 'pay_x', signature: 'abc' });
  assert.ok(r.success);
});

test('rejects a missing field', () => {
  const r = verifyPaymentSchema.safeParse({ orderId: 'order_x', paymentId: 'pay_x' });
  assert.strictEqual(r.success, false);
});

test('paymentsListQuerySchema defaults limit and accepts a cursor', () => {
  const r = paymentsListQuerySchema.parse({ cursor: 'abc' });
  assert.ok(r.limit >= 1);
  assert.strictEqual(r.cursor, 'abc');
});

test('paymentsListQuerySchema rejects a limit over the max', () => {
  assert.throws(() => paymentsListQuerySchema.parse({ limit: 9999 }));
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { verifyPaymentSchema, paymentsListQuerySchema } = require('../subscription.schema');

test('accepts a well-formed verify body', () => {
  const r = verifyPaymentSchema.safeParse({ orderId: 'sub_0123456789abcdef' });
  assert.ok(r.success);
});

test('rejects a missing or malformed order id (path chars, over 45)', () => {
  assert.strictEqual(verifyPaymentSchema.safeParse({}).success, false);
  assert.strictEqual(verifyPaymentSchema.safeParse({ orderId: '../x' }).success, false);
  assert.strictEqual(verifyPaymentSchema.safeParse({ orderId: 'a'.repeat(46) }).success, false);
});

test('paymentsListQuerySchema defaults limit and accepts a cursor', () => {
  const r = paymentsListQuerySchema.parse({ cursor: 'abc' });
  assert.ok(r.limit >= 1);
  assert.strictEqual(r.cursor, 'abc');
});

test('paymentsListQuerySchema rejects a limit over the max', () => {
  assert.throws(() => paymentsListQuerySchema.parse({ limit: 9999 }));
});

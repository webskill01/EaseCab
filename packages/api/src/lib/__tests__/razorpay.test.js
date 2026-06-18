'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createStubRazorpayClient } = require('../razorpay');

// createRazorpayClient wraps the live SDK (no logic to unit-test, coverage-excluded);
// the stub is pure and deterministic, so it's the part worth asserting.

test('stub createOrder returns a deterministic id derived from the receipt', async () => {
  const client = createStubRazorpayClient();
  const out = await client.createOrder({ amount: 14900, currency: 'INR', receipt: 'sub_u1_123' });
  assert.strictEqual(out.id, 'order_stub_sub_u1_123');
});

test('stub createOrder is stable for the same receipt and unique per receipt', async () => {
  const client = createStubRazorpayClient();
  const a = await client.createOrder({ receipt: 'sub_u1_1' });
  const b = await client.createOrder({ receipt: 'sub_u1_1' });
  const c = await client.createOrder({ receipt: 'sub_u2_9' });
  assert.strictEqual(a.id, b.id);
  assert.notStrictEqual(a.id, c.id);
});

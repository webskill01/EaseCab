'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createCashfreeClient, createStubCashfreeClient } = require('../cashfree');

// createCashfreeClient is live HTTP (coverage-excluded); the stub is the demo-mode contract.

test('stub echoes the order id and reports every order as paid', async () => {
  const cf = createStubCashfreeClient();
  const o = await cf.createOrder({ orderId: 'sub_abc', amountRupees: 149 });
  assert.strictEqual(o.id, 'sub_abc');
  assert.ok(o.paymentSessionId);
  assert.ok(await cf.getActiveSession('sub_abc'));
  assert.deepStrictEqual(await cf.getPaymentState('sub_abc'), { state: 'paid', paymentId: 'stub_pay_sub_abc', amountRupees: 149 });
});

test('an order unknown to Cashfree (404) reads as not payable + unpaid; other errors throw', async (t) => {
  const cf = createCashfreeClient({ appId: 'a', secretKey: 's', env: 'sandbox', returnUrl: 'https://x' });
  let status = 404;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status, json: async () => ({ code: 'order_not_found' }) }));
  assert.strictEqual(await cf.getActiveSession('order_legacy'), null);
  assert.deepStrictEqual(await cf.getPaymentState('order_legacy'), { state: 'unpaid' });
  status = 500;
  await assert.rejects(() => cf.getActiveSession('sub_x'), /CASHFREE_500/);
});

test('createOrder sends customer_name only when it is 3+ chars', async (t) => {
  const cf = createCashfreeClient({ appId: 'a', secretKey: 's', env: 'sandbox', returnUrl: 'https://x' });
  const bodies = [];
  t.mock.method(globalThis, 'fetch', async (_url, opts) => {
    bodies.push(JSON.parse(opts.body));
    return { ok: true, status: 200, json: async () => ({ order_id: 'o', payment_session_id: 's' }) };
  });
  const base = { orderId: 'o', amountRupees: 149, customerId: 'u', customerPhone: '9876543210' };
  await cf.createOrder({ ...base, customerName: '  Ravi Kumar ' });
  await cf.createOrder({ ...base, customerName: 'Al' });
  await cf.createOrder(base);
  assert.strictEqual(bodies[0].customer_details.customer_name, 'Ravi Kumar');
  assert.ok(!('customer_name' in bodies[1].customer_details));
  assert.ok(!('customer_name' in bodies[2].customer_details));
});

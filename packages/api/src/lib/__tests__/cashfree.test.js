'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createStubCashfreeClient } = require('../cashfree');

// createCashfreeClient is live HTTP (coverage-excluded); the stub is the demo-mode contract.

test('stub echoes the order id and reports every order as paid', async () => {
  const cf = createStubCashfreeClient();
  const o = await cf.createOrder({ orderId: 'sub_abc', amountRupees: 149 });
  assert.strictEqual(o.id, 'sub_abc');
  assert.ok(o.paymentSessionId);
  assert.ok(await cf.getActiveSession('sub_abc'));
  assert.deepStrictEqual(await cf.getPaymentState('sub_abc'), { state: 'paid', paymentId: 'stub_pay_sub_abc', amountRupees: 149 });
});

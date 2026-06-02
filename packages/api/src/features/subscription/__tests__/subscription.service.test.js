'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { createSubscriptionService } = require('../subscription.service');

const CONFIG = { razorpay: { keyId: 'rzp_test_x', keySecret: 'sek', webhookSecret: 'whsek' } };
const DAY = 86_400_000;

function baseRepo(over = {}) {
  return {
    async findOpenOrder() { return null; },
    async createOrderRecord() {},
    async findOrderRecord() { return { userId: 'u1', amount: 14900 }; },
    async findSubscriptionForCredit() { return { status: 'expired', expiresAt: null, trialExpiresAt: null, paidStartedAt: null }; },
    async acquirePaymentLock() { return true; },
    async recordCaptureAndExtend() { return { duplicate: false }; },
    async invalidateSubCache() {},
    async getSubscriptionCached() { return { status: 'active', trialExpiresAt: null, expiresAt: new Date(Date.now() + DAY) }; },
    ...over,
  };
}

test('checkout reuses an existing open order instead of creating a new one', async () => {
  let created = 0;
  const repo = baseRepo({
    async findOpenOrder() { return { razorpayOrderId: 'order_existing', amount: 14900 }; },
    async createOrderRecord() { created += 1; },
  });
  const razorpay = { async createOrder() { throw new Error('should not be called'); } };
  const svc = createSubscriptionService({ repo, razorpay, config: CONFIG });
  const out = await svc.createCheckout('u1');
  assert.strictEqual(out.orderId, 'order_existing');
  assert.strictEqual(created, 0);
});

test('checkout creates a new order when none open', async () => {
  const repo = baseRepo();
  const razorpay = { async createOrder() { return { id: 'order_new' }; } };
  const svc = createSubscriptionService({ repo, razorpay, config: CONFIG });
  const out = await svc.createCheckout('u1');
  assert.strictEqual(out.orderId, 'order_new');
  assert.strictEqual(out.amount, 14900);
  assert.strictEqual(out.keyId, 'rzp_test_x');
});

test('verifyPayment rejects a forged signature with VALIDATION_ERROR', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), razorpay: {}, config: CONFIG });
  await assert.rejects(
    () => svc.verifyPayment({ orderId: 'order_1', paymentId: 'pay_1', signature: 'bad' }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('verifyPayment credits on a valid signature', async () => {
  let credited = false;
  const repo = baseRepo({ async recordCaptureAndExtend() { credited = true; return { duplicate: false }; } });
  const svc = createSubscriptionService({ repo, razorpay: {}, config: CONFIG });
  const sig = crypto.createHmac('sha256', 'sek').update('order_1|pay_1').digest('hex');
  const out = await svc.verifyPayment({ orderId: 'order_1', paymentId: 'pay_1', signature: sig });
  assert.strictEqual(out.credited, true);
  assert.strictEqual(credited, true);
});

test('handleWebhook: bad signature → VALIDATION_ERROR', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), razorpay: {}, config: CONFIG });
  const raw = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
  await assert.rejects(() => svc.handleWebhook({ rawBody: raw, signature: 'bad' }), (e) => e.code === 'VALIDATION_ERROR');
});

test('handleWebhook: non-captured event is ignored', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), razorpay: {}, config: CONFIG });
  const raw = Buffer.from(JSON.stringify({ event: 'payment.failed' }));
  const sig = crypto.createHmac('sha256', 'whsek').update(raw).digest('hex');
  const out = await svc.handleWebhook({ rawBody: raw, signature: sig });
  assert.strictEqual(out.credited, false);
  assert.strictEqual(out.reason, 'ignored_event');
});

test('handleWebhook: payment.captured credits via the order-resolved user', async () => {
  let creditedUser = null;
  const repo = baseRepo({ async recordCaptureAndExtend(args) { creditedUser = args.userId; return { duplicate: false }; } });
  const svc = createSubscriptionService({ repo, razorpay: {}, config: CONFIG });
  const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 14900 } } } };
  const raw = Buffer.from(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', 'whsek').update(raw).digest('hex');
  const out = await svc.handleWebhook({ rawBody: raw, signature: sig });
  assert.strictEqual(out.credited, true);
  assert.strictEqual(creditedUser, 'u1');
});

test('credit is a no-op when the redis lock is already held (duplicate)', async () => {
  let extended = 0;
  const repo = baseRepo({
    async acquirePaymentLock() { return false; },
    async recordCaptureAndExtend() { extended += 1; return { duplicate: false }; },
  });
  const svc = createSubscriptionService({ repo, razorpay: {}, config: CONFIG });
  const sig = crypto.createHmac('sha256', 'sek').update('order_1|pay_1').digest('hex');
  const out = await svc.verifyPayment({ orderId: 'order_1', paymentId: 'pay_1', signature: sig });
  assert.strictEqual(out.credited, false);
  assert.strictEqual(extended, 0);
});

test('getStatus returns the snapshot with isActive', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), razorpay: {}, config: CONFIG });
  const out = await svc.getStatus('u1');
  assert.strictEqual(out.status, 'active');
  assert.strictEqual(out.isActive, true);
});

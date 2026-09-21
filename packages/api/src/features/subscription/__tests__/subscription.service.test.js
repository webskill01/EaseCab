'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { createSubscriptionService } = require('../subscription.service');

const CONFIG = { cashfree: { secretKey: 'cf_secret_key_16chars', env: 'sandbox' } };
const DAY = 86_400_000;

function baseRepo(over = {}) {
  return {
    async incrCheckoutAttempts() { return over.checkoutCount ?? 1; },
    async incrVerifyAttempts() { return over.verifyCount ?? 1; },
    async incrWebhookAttempts() { return over.webhookCount ?? 1; },
    async listRecentOpenOrders() { return []; },
    async findOpenOrder() { return null; },
    async findUserPhone() { return '+919876543210'; },
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

const paid = (paymentId = '555', amountRupees = 149) => ({ async getPaymentState() { return { state: 'paid', paymentId, amountRupees }; } });
const paidGateway = paid();
const successEvent = (over = {}) => ({
  type: 'PAYMENT_SUCCESS_WEBHOOK',
  data: { order: { order_id: 'sub_1' }, payment: { cf_payment_id: 555, payment_status: 'SUCCESS', ...over } },
});
const sign = (ts, raw) => crypto.createHmac('sha256', CONFIG.cashfree.secretKey).update(ts + raw.toString()).digest('base64');

test('checkout reuses an open order while Cashfree still reports it ACTIVE', async () => {
  let created = 0;
  const repo = baseRepo({
    async findOpenOrder() { return { razorpayOrderId: 'sub_existing', amount: 14900 }; },
    async createOrderRecord() { created += 1; },
  });
  const cashfree = {
    async getActiveSession(id) { return `sess_${id}`; },
    async createOrder() { throw new Error('should not be called'); },
  };
  const svc = createSubscriptionService({ repo, cashfree, config: CONFIG });
  const out = await svc.createCheckout('u1');
  assert.strictEqual(out.orderId, 'sub_existing');
  assert.strictEqual(out.paymentSessionId, 'sess_sub_existing');
  assert.strictEqual(created, 0);
});

test('checkout creates a fresh order when the open one is no longer ACTIVE', async () => {
  const repo = baseRepo({ async findOpenOrder() { return { razorpayOrderId: 'sub_old', amount: 14900 }; } });
  const cashfree = {
    async getActiveSession() { return null; },
    async getPaymentState() { return { state: 'unpaid' }; },
    async createOrder(a) { return { id: a.orderId, paymentSessionId: 'sess_new' }; },
  };
  const svc = createSubscriptionService({ repo, cashfree, config: CONFIG });
  const out = await svc.createCheckout('u1');
  assert.notStrictEqual(out.orderId, 'sub_old');
  assert.strictEqual(out.paymentSessionId, 'sess_new');
});

test('checkout credits a paid-but-unconfirmed open order instead of opening a second one', async () => {
  let credited = null;
  const repo = baseRepo({
    async findOpenOrder() { return { razorpayOrderId: 'sub_paid', amount: 14900 }; },
    async recordCaptureAndExtend(a) { credited = a; return { duplicate: false }; },
  });
  const cashfree = {
    async getActiveSession() { return null; },
    async getPaymentState() { return { state: 'paid', paymentId: '777', amountRupees: 149 }; },
    async createOrder() { throw new Error('should not be called'); },
  };
  const svc = createSubscriptionService({ repo, cashfree, config: CONFIG });
  assert.deepStrictEqual(await svc.createCheckout('u1'), { alreadyPaid: true });
  assert.strictEqual(credited.razorpayOrderId, 'sub_paid');
});

test('checkout sends rupees, a 10-digit phone and a Cashfree-legal order id', async () => {
  let sent;
  const cashfree = { async createOrder(a) { sent = a; return { id: a.orderId, paymentSessionId: 'sess' }; } };
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree, config: CONFIG });
  const out = await svc.createCheckout('u1');
  assert.strictEqual(sent.amountRupees, 149);
  assert.strictEqual(sent.customerPhone, '9876543210');
  assert.strictEqual(sent.customerId, 'u1');
  assert.match(sent.orderId, /^[A-Za-z0-9_-]{1,45}$/);
  assert.strictEqual(out.amount, 14900);
});

test('checkout over the per-user window cap → RATE_LIMITED (no order created)', async () => {
  let created = 0;
  const repo = baseRepo({ checkoutCount: 6, async createOrderRecord() { created += 1; } });
  const cashfree = { async createOrder() { throw new Error('should not be called'); } };
  const svc = createSubscriptionService({ repo, cashfree, config: CONFIG });
  await assert.rejects(() => svc.createCheckout('u1'), (e) => e.code === 'RATE_LIMITED');
  assert.strictEqual(created, 0);
});

test('verifyPayment credits only when Cashfree reports a SUCCESS payment', async () => {
  let credited = null;
  const repo = baseRepo({ async recordCaptureAndExtend(a) { credited = a; return { duplicate: false }; } });
  const svc = createSubscriptionService({ repo, cashfree: paidGateway, config: CONFIG });
  const out = await svc.verifyPayment({ userId: 'u1', orderId: 'sub_1' });
  assert.strictEqual(out.credited, true);
  assert.strictEqual(credited.razorpayPaymentId, '555');
});

test('verifyPayment on an unpaid order → not_paid, no credit', async () => {
  const cashfree = { async getPaymentState() { return { state: 'unpaid' }; } };
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree, config: CONFIG });
  const out = await svc.verifyPayment({ userId: 'u1', orderId: 'sub_1' });
  assert.deepStrictEqual(out, { credited: false, reason: 'not_paid' });
});

test('verifyPayment on another user\'s order → NOT_FOUND (no gateway call)', async () => {
  const cashfree = { async getPaymentState() { throw new Error('should not be called'); } };
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree, config: CONFIG });
  await assert.rejects(() => svc.verifyPayment({ userId: 'u2', orderId: 'sub_1' }), (e) => e.code === 'NOT_FOUND');
});

test('handleWebhook over the per-IP cap → RATE_LIMITED before any HMAC or gateway work', async () => {
  const cashfree = { async getPaymentState() { throw new Error('should not be called'); } };
  const svc = createSubscriptionService({ repo: baseRepo({ webhookCount: 61 }), cashfree, config: CONFIG });
  const raw = Buffer.from(JSON.stringify(successEvent()));
  await assert.rejects(
    () => svc.handleWebhook({ ip: '1.2.3.4', rawBody: raw, timestamp: '1', signature: sign('1', raw) }),
    (e) => e.code === 'RATE_LIMITED',
  );
});

test('handleWebhook: bad signature → VALIDATION_ERROR', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree: {}, config: CONFIG });
  const raw = Buffer.from(JSON.stringify(successEvent()));
  await assert.rejects(
    () => svc.handleWebhook({ rawBody: raw, timestamp: '1', signature: sign('2', raw) }),
    (e) => e.code === 'VALIDATION_ERROR',
  );
});

test('handleWebhook: non-success event is ignored', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree: {}, config: CONFIG });
  const raw = Buffer.from(JSON.stringify({ type: 'PAYMENT_FAILED_WEBHOOK', data: {} }));
  const out = await svc.handleWebhook({ rawBody: raw, timestamp: '1', signature: sign('1', raw) });
  assert.strictEqual(out.reason, 'ignored_event');
});

test('handleWebhook: PAYMENT_SUCCESS credits via the order-resolved user', async () => {
  let creditedUser = null;
  const repo = baseRepo({ async recordCaptureAndExtend(args) { creditedUser = args.userId; return { duplicate: false }; } });
  const svc = createSubscriptionService({ repo, cashfree: paidGateway, config: CONFIG });
  const raw = Buffer.from(JSON.stringify(successEvent()));
  const out = await svc.handleWebhook({ rawBody: raw, timestamp: '1726900000', signature: sign('1726900000', raw) });
  assert.strictEqual(out.credited, true);
  assert.strictEqual(creditedUser, 'u1');
});

test('handleWebhook trusts the re-fetch, not the body: signed SUCCESS event but gateway says unpaid → no credit', async () => {
  let credited = false;
  const repo = baseRepo({ async recordCaptureAndExtend() { credited = true; return { duplicate: false }; } });
  const cashfree = { async getPaymentState() { return { state: 'unpaid' }; } };
  const svc = createSubscriptionService({ repo, cashfree, config: CONFIG });
  const raw = Buffer.from(JSON.stringify(successEvent()));
  const out = await svc.handleWebhook({ rawBody: raw, timestamp: '1', signature: sign('1', raw) });
  assert.strictEqual(out.reason, 'not_paid');
  assert.strictEqual(credited, false);
});

test('handleWebhook: success event without an order id → malformed', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree: paidGateway, config: CONFIG });
  const raw = Buffer.from(JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {} }));
  const out = await svc.handleWebhook({ rawBody: raw, timestamp: '1', signature: sign('1', raw) });
  assert.strictEqual(out.reason, 'malformed');
});

test('a paid amount that differs from what we charged is refused loudly (500), never credited', async () => {
  let credited = false;
  const repo = baseRepo({ async recordCaptureAndExtend() { credited = true; return { duplicate: false }; } });
  const svc = createSubscriptionService({ repo, cashfree: paid('555', 1), config: CONFIG });
  await assert.rejects(() => svc.verifyPayment({ userId: 'u1', orderId: 'sub_1' }), (e) => e.code === 'INTERNAL_ERROR');
  assert.strictEqual(credited, false);
});

test('verifyPayment on a bank-pending payment → reason pending, no credit', async () => {
  const cashfree = { async getPaymentState() { return { state: 'pending' }; } };
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree, config: CONFIG });
  assert.deepStrictEqual(await svc.verifyPayment({ userId: 'u1', orderId: 'sub_1' }), { credited: false, reason: 'pending' });
});

test('verifyPayment over the per-user window cap → RATE_LIMITED (no gateway call)', async () => {
  const cashfree = { async getPaymentState() { throw new Error('should not be called'); } };
  const svc = createSubscriptionService({ repo: baseRepo({ verifyCount: 21 }), cashfree, config: CONFIG });
  await assert.rejects(() => svc.verifyPayment({ userId: 'u1', orderId: 'sub_1' }), (e) => e.code === 'RATE_LIMITED');
});

test('checkout tells the browser which Cashfree mode to open', async () => {
  const cashfree = { async createOrder(a) { return { id: a.orderId, paymentSessionId: 's' }; } };
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree, config: CONFIG });
  assert.strictEqual((await svc.createCheckout('u1')).mode, 'sandbox');
});

test('reconcileOpenOrders credits only the paid orders in the window', async () => {
  const credited = [];
  const repo = baseRepo({
    async listRecentOpenOrders() {
      return [{ userId: 'u1', razorpayOrderId: 'sub_paid', amount: 14900 }, { userId: 'u2', razorpayOrderId: 'sub_open', amount: 14900 }];
    },
    async recordCaptureAndExtend(a) { credited.push(a.razorpayOrderId); return { duplicate: false }; },
  });
  const cashfree = {
    async getPaymentState(id) { return id === 'sub_paid' ? { state: 'paid', paymentId: '9', amountRupees: 149 } : { state: 'unpaid' }; },
  };
  const svc = createSubscriptionService({ repo, cashfree, config: CONFIG });
  assert.strictEqual(await svc.reconcileOpenOrders(), 1);
  assert.deepStrictEqual(credited, ['sub_paid']);
});

// --- Cashfree STUB demo mode (CASHFREE_STUB=true; never production — server.js FATALs) ---
const STUB_CONFIG = { cashfree: { ...CONFIG.cashfree, stub: true } };

test('stub mode: handleWebhook credits a success event WITHOUT a valid HMAC', async () => {
  let creditedUser = null;
  const repo = baseRepo({ async recordCaptureAndExtend(args) { creditedUser = args.userId; return { duplicate: false }; } });
  const svc = createSubscriptionService({ repo, cashfree: paidGateway, config: STUB_CONFIG });
  const raw = Buffer.from(JSON.stringify(successEvent()));
  const out = await svc.handleWebhook({ rawBody: raw, timestamp: '1', signature: 'bad' });
  assert.strictEqual(out.credited, true);
  assert.strictEqual(creditedUser, 'u1');
});

test('credit is a no-op when the redis lock is already held (duplicate)', async () => {
  let extended = 0;
  const repo = baseRepo({
    async acquirePaymentLock() { return false; },
    async recordCaptureAndExtend() { extended += 1; return { duplicate: false }; },
  });
  const svc = createSubscriptionService({ repo, cashfree: paidGateway, config: CONFIG });
  const out = await svc.verifyPayment({ userId: 'u1', orderId: 'sub_1' });
  assert.strictEqual(out.credited, false);
  assert.strictEqual(extended, 0);
});

test('getStatus returns the snapshot with isActive', async () => {
  const svc = createSubscriptionService({ repo: baseRepo(), cashfree: {}, config: CONFIG });
  const out = await svc.getStatus('u1');
  assert.strictEqual(out.status, 'active');
  assert.strictEqual(out.isActive, true);
});

test('listPayments maps rows to the public shape and yields no cursor when not full', async () => {
  const at = new Date('2026-06-10T00:00:00Z');
  const repo = baseRepo({
    async listCapturedPayments({ limit }) {
      assert.strictEqual(limit, 20);
      return [{ id: 'p1', amount: 14900, status: 'captured', razorpayPaymentId: 'pay_1', updatedAt: at }];
    },
  });
  const svc = createSubscriptionService({ repo, cashfree: {}, config: CONFIG });
  const out = await svc.listPayments({ userId: 'u1', limit: 20, cursor: undefined });
  assert.strictEqual(out.nextCursor, null);
  assert.deepStrictEqual(out.payments, [{ id: 'p1', amount: 14900, status: 'captured', paymentId: 'pay_1', paidAt: at }]);
});

test('listPayments returns a nextCursor when the page is full (limit+1 fetched)', async () => {
  const at = new Date('2026-06-10T00:00:00Z');
  const rows = Array.from({ length: 3 }, (_, i) => ({ id: `p${i}`, amount: 14900, status: 'captured', razorpayPaymentId: `pay_${i}`, updatedAt: at }));
  const repo = baseRepo({ async listCapturedPayments() { return rows; } });
  const svc = createSubscriptionService({ repo, cashfree: {}, config: CONFIG });
  const out = await svc.listPayments({ userId: 'u1', limit: 2, cursor: undefined });
  assert.strictEqual(out.payments.length, 2);
  assert.ok(typeof out.nextCursor === 'string' && out.nextCursor.length > 0);
});

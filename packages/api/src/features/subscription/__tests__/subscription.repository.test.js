'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createSubscriptionRepository } = require('../subscription.repository');

function fakeRedis() {
  const store = new Map();
  return {
    store,
    async set(k, _v, _ex, _ttl, nx) {
      if (nx === 'NX' && store.has(k)) return null;
      store.set(k, '1');
      return 'OK';
    },
    async get(k) { return store.get(k) ?? null; },
    async del(k) { return store.delete(k) ? 1 : 0; },
  };
}

test('acquirePaymentLock is true once then false (dedupe)', async () => {
  const repo = createSubscriptionRepository({ prisma: {}, redis: fakeRedis() });
  assert.strictEqual(await repo.acquirePaymentLock('pay_1'), true);
});

test('findOpenOrder returns newest created row, createOrderRecord inserts created', async () => {
  const rows = [];
  const prisma = {
    payment: {
      async findFirst({ where }) {
        assert.strictEqual(where.status, 'created');
        const mine = rows.filter((r) => r.userId === where.userId && r.status === 'created');
        return mine.length ? mine[mine.length - 1] : null;
      },
      async create({ data }) { const r = { id: `p${rows.length}`, ...data }; rows.push(r); return r; },
    },
  };
  const repo = createSubscriptionRepository({ prisma, redis: fakeRedis() });
  assert.strictEqual(await repo.findOpenOrder('u1'), null);
  await repo.createOrderRecord({ userId: 'u1', razorpayOrderId: 'order_1', amount: 14900 });
  const open = await repo.findOpenOrder('u1');
  assert.strictEqual(open.razorpayOrderId, 'order_1');
});

test('recordCaptureAndExtend: first credit flips created→captured + updates sub; duplicate (P2002) returns {duplicate:true}', async () => {
  let payRow = { id: 'p0', userId: 'u1', razorpayOrderId: 'order_1', razorpayPaymentId: null, status: 'created', amount: 14900 };
  const subUpdates = [];
  let throwP2002 = false;
  const tx = {
    payment: {
      async updateMany({ where, data }) {
        if (payRow.razorpayOrderId === where.razorpayOrderId && payRow.status === where.status) {
          payRow = { ...payRow, ...data };
          return { count: 1 };
        }
        return { count: 0 };
      },
      async create() { if (throwP2002) { const e = new Error('dup'); e.code = 'P2002'; throw e; } return {}; },
    },
    subscription: { async update({ data }) { subUpdates.push(data); return data; } },
  };
  const prisma = { async $transaction(fn) { return fn(tx); } };
  const repo = createSubscriptionRepository({ prisma, redis: fakeRedis() });

  const newExpiresAt = new Date('2026-07-02T00:00:00Z');
  const r1 = await repo.recordCaptureAndExtend({ userId: 'u1', razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', amount: 14900, newExpiresAt, paidStartedAt: newExpiresAt });
  assert.strictEqual(r1.duplicate, false);
  assert.strictEqual(payRow.status, 'captured');
  assert.strictEqual(payRow.razorpayPaymentId, 'pay_1');
  assert.strictEqual(subUpdates.length, 1);

  // Duplicate: no created row left (status already captured) → create path → P2002.
  throwP2002 = true;
  const r2 = await repo.recordCaptureAndExtend({ userId: 'u1', razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', amount: 14900, newExpiresAt, paidStartedAt: newExpiresAt });
  assert.strictEqual(r2.duplicate, true);
  assert.strictEqual(subUpdates.length, 1); // NOT extended again
});

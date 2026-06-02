'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES } = require('@easecab/shared');
const { buildApp } = require('../../../app');
const { createJwt } = require('../../../lib/jwt');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  razorpay: { keyId: 'rzp_test_x', keySecret: 's'.repeat(16), webhookSecret: 'w'.repeat(16) },
};
const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const jwt = createJwt(CONFIG.jwt);
const authCookie = `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: 'u1', role: 'user' })}`;

function fakeRedis() {
  const store = new Map();
  return {
    async set(k, v, _ex, _ttl, nx) { if (nx === 'NX' && store.has(k)) return null; store.set(k, v); return 'OK'; },
    async get(k) { return store.get(k) ?? null; },
    async del(k) { return store.delete(k) ? 1 : 0; },
    async eval() { return 1; },
    async ttl() { return -2; },
  };
}

function fakePrisma() {
  const payments = [];
  let seq = 0;
  const sub = { userId: 'u1', status: 'trial', trialExpiresAt: new Date(Date.now() + 2 * 86_400_000), expiresAt: null, paidStartedAt: null };
  return {
    _sub: sub,
    payment: {
      async findFirst({ where, orderBy }) {
        let rows = payments.filter((p) => (where.userId ? p.userId === where.userId : true) && (where.status ? p.status === where.status : true) && (where.razorpayOrderId ? p.razorpayOrderId === where.razorpayOrderId : true));
        if (orderBy) rows = rows.slice().reverse();
        return rows[0] || null;
      },
      async findUnique({ where }) { return payments.find((p) => p.razorpayOrderId === where.razorpayOrderId) || null; },
      async create({ data }) { const r = { id: `p${++seq}`, ...data }; payments.push(r); return r; },
      async updateMany({ where, data }) {
        let n = 0;
        for (const p of payments) {
          if (p.razorpayOrderId === where.razorpayOrderId && p.status === where.status) { Object.assign(p, data); n += 1; }
        }
        return { count: n };
      },
    },
    subscription: {
      async findUnique() { return { status: sub.status, trialExpiresAt: sub.trialExpiresAt, expiresAt: sub.expiresAt, paidStartedAt: sub.paidStartedAt }; },
      async update({ data }) { Object.assign(sub, data); return sub; },
    },
    async $transaction(fn) { return fn(this); },
  };
}

function appWith(prisma) {
  return buildApp({
    prisma, redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+919876543210' }) },
    subscriber: inertSubscriber,
    razorpay: { async createOrder() { return { id: 'order_new' }; } },
  });
}

test('POST /checkout requires auth', async () => {
  const res = await request(appWith(fakePrisma())).post('/api/v1/subscriptions/checkout');
  assert.strictEqual(res.status, 401);
});

test('POST /checkout creates an order; second call reuses it', async () => {
  const app = appWith(fakePrisma());
  const r1 = await request(app).post('/api/v1/subscriptions/checkout').set('Cookie', authCookie);
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r1.body.data.orderId, 'order_new');
  const r2 = await request(app).post('/api/v1/subscriptions/checkout').set('Cookie', authCookie);
  assert.strictEqual(r2.body.data.orderId, 'order_new'); // reused, not a new id
});

test('webhook with a valid signature credits + flips sub to active', async () => {
  const prisma = fakePrisma();
  const app = appWith(prisma);
  await request(app).post('/api/v1/subscriptions/checkout').set('Cookie', authCookie);
  const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_new', amount: 14900 } } } };
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', CONFIG.razorpay.webhookSecret).update(raw).digest('hex');
  const res = await request(app).post('/api/v1/subscriptions/webhook').set('X-Razorpay-Signature', sig).set('Content-Type', 'application/json').send(raw);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.credited, true);
  assert.strictEqual(prisma._sub.status, 'active');
});

test('webhook with a forged signature → 422, no credit', async () => {
  const prisma = fakePrisma();
  const app = appWith(prisma);
  const raw = JSON.stringify({ event: 'payment.captured' });
  const res = await request(app).post('/api/v1/subscriptions/webhook').set('X-Razorpay-Signature', 'deadbeef').set('Content-Type', 'application/json').send(raw);
  assert.strictEqual(res.status, 422);
  assert.strictEqual(prisma._sub.status, 'trial');
});

test('GET /me returns the cached snapshot with isActive', async () => {
  const res = await request(appWith(fakePrisma())).get('/api/v1/subscriptions/me').set('Cookie', authCookie);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.isActive, true); // trial still in-window
});

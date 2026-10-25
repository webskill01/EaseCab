'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };
const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  cashfree: { secretKey: 'x'.repeat(16) },
  referrals: { all: false, phones: ['+919812345678'] },
};

const ROWS = [
  { id: 'r1', name: 'Gurpreet', phone: '+919811111111', createdAt: new Date('2026-10-19T05:00:00Z'), referralRewardedAt: new Date(),
    referredBy: { id: 'u1', name: 'Sunil', phone: '+919822222222' }, _count: { payments: 1, paymentsOnBehalf: 0 } },
  { id: 'r2', name: null, phone: '+919833333333', createdAt: new Date('2026-10-18T05:00:00Z'), referralRewardedAt: null,
    referredBy: { id: 'u1', name: 'Sunil', phone: '+919822222222' }, _count: { payments: 0, paymentsOnBehalf: 0 } },
];

function fakePrisma(calls) {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    user: {
      async findMany(args) { calls.push(args); return ROWS; },
      async count({ where }) { return where.referralRewardedAt ? 4 : where.OR ? 1 : 2; },
      async groupBy() { return [{ referredById: 'u1' }]; },
    },
  };
}

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const redis = { async ttl() { return -2; }, async eval() { return 1; }, async set() { return 'OK'; }, async get() { return null; }, async del() { return 1; }, async publish() { return 1; } };

function setup() {
  const calls = [];
  const app = buildApp({
    prisma: fakePrisma(calls), redis, logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, cashfree: { async createOrder() { return { id: 'o' }; } }, surepass: {},
  });
  return { app, calls };
}

async function adminAgent(app) {
  const agent = request.agent(app);
  await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  return agent;
}

test('GET /admin/referrals without a session → 401', async () => {
  assert.strictEqual((await request(setup().app).get('/api/v1/admin/referrals')).status, 401);
});

test('GET lists referees with full phones, paid/rewarded, totals and rollout', async () => {
  const { app, calls } = setup();
  const res = await (await adminAgent(app)).get('/api/v1/admin/referrals?page=2&limit=10');
  assert.strictEqual(res.status, 200);
  const [a, b] = res.body.data.referrals;
  assert.deepStrictEqual(a.referee, { id: 'r1', name: 'Gurpreet', phone: '+919811111111' });
  assert.deepStrictEqual(a.referrer, { id: 'u1', name: 'Sunil', phone: '+919822222222' });
  assert.strictEqual(a.paid, true);
  assert.strictEqual(a.rewarded, true);
  assert.strictEqual(b.paid, false);
  assert.strictEqual(b.rewarded, false);
  assert.deepStrictEqual(res.body.data.summary, { referrals: 2, paid: 1, referrers: 1, monthsGranted: 2 });
  assert.deepStrictEqual(res.body.data.rollout, { all: false, testers: 1 });
  assert.deepStrictEqual(res.body.meta, { page: 2, limit: 10, total: 2 });
  assert.strictEqual(calls[0].skip, 10);
});

test('GET filters by search + status and sorts oldest first; summary stays program-wide', async () => {
  const { app, calls } = setup();
  const res = await (await adminAgent(app)).get('/api/v1/admin/referrals?q=Sunil&status=unpaid&sort=oldest');
  assert.strictEqual(res.status, 200);
  const { where, orderBy } = calls[0];
  assert.deepStrictEqual(orderBy, [{ createdAt: 'asc' }, { id: 'asc' }]);
  assert.ok(where.AND.some((c) => c.payments?.none && c.paymentsOnBehalf?.none), 'unpaid clause');
  const search = where.AND.find((c) => c.OR?.some((o) => o.referredBy));
  assert.strictEqual(search.OR[1].referredBy.is.OR[1].name.contains, 'Sunil');
  assert.strictEqual(res.body.data.summary.referrals, 2);
});

test('GET rejects an unknown status → 422', async () => {
  assert.strictEqual((await (await adminAgent(setup().app)).get('/api/v1/admin/referrals?status=bogus')).status, 422);
});

test('GET rejects a bad page size → 422', async () => {
  assert.strictEqual((await (await adminAgent(setup().app)).get('/api/v1/admin/referrals?limit=500')).status, 422);
});

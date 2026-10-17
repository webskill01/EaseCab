'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const TOKEN = 'm'.repeat(40);

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  memberSync: { token: TOKEN },
  cashfree: { secretKey: 'x'.repeat(16) },
};

function fakeRedis(failures = null) {
  const m = new Map();
  return {
    async ttl() { return -2; },
    async eval(_s, _n, k) { const c = (m.get(k) || 0) + 1; m.set(k, c); return c; },
    async set() { return 'OK'; }, async get() { return failures; }, async del() { return 0; },
    async publish() { return 1; },
  };
}

const subs = [
  { userId: 'u1', status: 'active', expiresAt: new Date('2026-11-16T10:00:00Z'), updatedAt: new Date('2026-10-16T10:00:00Z'), user: { phone: '+919876543210' } },
];
const pays = [
  { userId: 'u1', amount: 14900, status: 'captured', updatedAt: new Date('2026-10-16T10:00:00Z'), user: { phone: '+919876543210' } },
];
const seen = {};

const prisma = {
  async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
  adminUser: { async findUnique() { return null; }, async findFirst() { return null; } },
  subscription: {
    async findMany({ where }) {
      seen.subWhere = where;
      return subs.filter((s) => !where.updatedAt || s.updatedAt >= where.updatedAt.gte);
    },
  },
  payment: {
    async findMany({ where }) { return pays.filter((p) => !where.userId || where.userId.in.includes(p.userId)); },
    async groupBy() { return [{ userId: 'u1', _min: { updatedAt: pays[0].updatedAt } }]; },
  },
};

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const surepass = { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } };

function app(config = CONFIG, redis = fakeRedis()) {
  return buildApp({
    prisma, redis, logger: pino({ level: 'silent' }), config,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, cashfree: { async createOrder() { return { id: 'o' }; } }, surepass,
  });
}
const get = (path) => request(app()).get(`/api/v1/member-sync${path}`).set('x-token', TOKEN);

test('rejects a missing or wrong token with 401 in the standard envelope', async () => {
  const res = await request(app()).get('/api/v1/member-sync/memberships').set('x-token', 'wrong');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('an IP over the failed-token limit gets 429 even with the right token', async () => {
  const res = await request(app(CONFIG, fakeRedis('20'))).get('/api/v1/member-sync/memberships').set('x-token', TOKEN);
  assert.strictEqual(res.status, 429);
});

test('is not mounted without MEMBER_SYNC_TOKEN', async () => {
  const res = await request(app({ ...CONFIG, memberSync: {} })).get('/api/v1/member-sync/memberships').set('x-token', TOKEN);
  assert.strictEqual(res.status, 404);
});

test('GET /memberships returns 10-digit phones with expiry and payment info', async () => {
  const res = await get('/memberships?since=2026-10-01T00:00:00Z');
  assert.strictEqual(res.status, 200);
  assert.ok(seen.subWhere.updatedAt.gte instanceof Date, 'since becomes a Date filter');
  assert.deepStrictEqual(res.body.data.members, [{
    phone: '9876543210', status: 'active', expiresAt: '2026-11-16T10:00:00.000Z',
    paidCount: 1, lastPaidAt: '2026-10-16T10:00:00.000Z', lastAmount: 149,
  }]);
  assert.deepStrictEqual(res.body.meta, { total: 1, truncated: false });
});

test('GET /memberships filters by phones and rejects a bad phone', async () => {
  const ok = await get('/memberships?phones=9876543210');
  assert.strictEqual(ok.status, 200);
  assert.deepStrictEqual(seen.subWhere.user, { phone: { in: ['+919876543210'] } });
  const bad = await get('/memberships?phones=12345');
  assert.strictEqual(bad.status, 422);
});

test('GET /payments returns captured payments flagged first/renewal and validates the range', async () => {
  const res = await get('/payments?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.data.payments, [
    { phone: '9876543210', amount: 149, paidAt: '2026-10-16T10:00:00.000Z', first: true },
  ]);
  const backwards = await get('/payments?from=2026-11-01T00:00:00Z&to=2026-10-01T00:00:00Z');
  assert.strictEqual(backwards.status, 422);
});

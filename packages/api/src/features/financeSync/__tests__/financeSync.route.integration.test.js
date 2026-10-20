'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const TOKEN = 'f'.repeat(40);

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  financeSync: { token: TOKEN },
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

const prisma = {
  async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
  adminUser: { async findUnique() { return null; }, async findFirst() { return null; } },
  async $queryRaw() {
    return [
      { day: new Date('2026-10-20T00:00:00Z'), signups: 3, paidAccounts: 1, payments: 2, revenuePaise: 29800 },
      { day: new Date('2026-10-19T00:00:00Z'), signups: 1, paidAccounts: 0, payments: 0, revenuePaise: 0 },
    ];
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
const get = (path, a = app()) => request(a).get(`/api/v1/finance-sync${path}`).set('x-token', TOKEN);

test('returns every day as YYYY-MM-DD with the daily counts', async () => {
  const res = await get('/daily?since=');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.data[0], { day: '2026-10-20', signups: 3, paidAccounts: 1, payments: 2, revenuePaise: 29800 });
  assert.strictEqual(res.body.meta.total, 2);
});

test('since drops earlier days', async () => {
  const res = await get('/daily?since=2026-10-20');
  assert.deepStrictEqual(res.body.data.map((d) => d.day), ['2026-10-20']);
});

test('a malformed since is a 422', async () => {
  const res = await get('/daily?since=yesterday');
  assert.strictEqual(res.status, 422);
});

test('rejects a wrong token with 401', async () => {
  const res = await request(app()).get('/api/v1/finance-sync/daily').set('x-token', 'wrong');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('an IP over the failed-token limit gets 429 even with the right token', async () => {
  const res = await get('/daily', app(CONFIG, fakeRedis('20')));
  assert.strictEqual(res.status, 429);
});

test('is not mounted without FINANCE_SYNC_TOKEN', async () => {
  const res = await get('/daily', app({ ...CONFIG, financeSync: {} }));
  assert.strictEqual(res.status, 404);
});

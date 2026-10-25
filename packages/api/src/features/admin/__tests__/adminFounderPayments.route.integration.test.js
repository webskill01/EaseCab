'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const PAY_ID = '33333333-3333-3333-3333-333333333333';
const LINKED_ID = '44444444-4444-4444-4444-444444444444';
const MEMBER = { id: '55555555-5555-5555-5555-555555555555', name: 'Khushvinder', subscription: null };

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  cashfree: { secretKey: 'x'.repeat(16) },
};

const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };

function fakeRedis() {
  const m = new Map();
  return {
    dels: [],
    async ttl() { return -2; },
    async eval(_s, _n, k) { const c = (m.get(k) || 0) + 1; m.set(k, c); return c; },
    async set() { return 'OK'; }, async get() { return null; },
    async del(k) { this.dels.push(k); return 1; },
    async publish() { return 1; },
  };
}

function fakePrisma(state) {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    async $executeRaw() { state.raw += 1; return state.rawResult; },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    payment: {
      async findMany(args) { state.lists.push(args); return [{ id: PAY_ID, amount: 14900, updatedAt: new Date(), onBehalfOf: null }]; },
      async count({ where }) { return where.onBehalfOfUserId === null ? 1 : 2; },
      async findFirst({ where }) {
        if (where.id === PAY_ID) return { id: PAY_ID, onBehalfOfUserId: null };
        if (where.id === LINKED_ID) return { id: LINKED_ID, onBehalfOfUserId: MEMBER.id };
        return null;
      },
    },
    user: { async findFirst({ where }) { return where.phone === '+919812345678' ? { ...MEMBER } : null; } },
    subscription: { async upsert(args) { state.upserts.push(args); return {}; } },
  };
}

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const surepass = { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } };

function setup() {
  const state = { raw: 0, rawResult: 1, upserts: [], lists: [] };
  const redis = fakeRedis();
  const app = buildApp({
    prisma: fakePrisma(state), redis, logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, cashfree: { async createOrder() { return { id: 'o' }; } }, surepass,
  });
  return { state, redis, app };
}

async function adminAgent(app) {
  const agent = request.agent(app);
  await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  return agent;
}

const linkUrl = (id) => `/api/v1/admin/founder-payments/${id}/link`;

test('GET /admin/founder-payments without a session → 401', async () => {
  assert.strictEqual((await request(setup().app).get('/api/v1/admin/founder-payments')).status, 401);
});

test('GET lists payments with the unlinked count', async () => {
  const res = await (await adminAgent(setup().app)).get('/api/v1/admin/founder-payments');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.payments[0].id, PAY_ID);
  assert.strictEqual(res.body.data.payments[0].member, null);
  assert.strictEqual(res.body.data.unlinked, 1);
  assert.strictEqual(res.body.meta.total, 2);
});

test('GET filters linked payments by member search, oldest first', async () => {
  const { app, state } = setup();
  const res = await (await adminAgent(app)).get('/api/v1/admin/founder-payments?status=linked&q=98123&sort=oldest');
  assert.strictEqual(res.status, 200);
  const { where, orderBy } = state.lists[0];
  assert.deepStrictEqual(orderBy, [{ updatedAt: 'asc' }, { id: 'asc' }]);
  assert.ok(where.AND.some((c) => c.onBehalfOfUserId && c.onBehalfOfUserId.not === null), 'linked clause');
  assert.strictEqual(where.AND.find((c) => c.onBehalfOf).onBehalfOf.is.OR[0].phone.contains, '98123');
  assert.strictEqual(res.body.data.unlinked, 1);
});

test('link with membership: normalises the phone, links, extends 30 days, drops sub cache', async () => {
  const { state, redis, app } = setup();
  const res = await (await adminAgent(app)).post(linkUrl(PAY_ID)).send({ phone: '98123 45678' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.member.name, 'Khushvinder');
  assert.strictEqual(res.body.data.member.phone, '+919812345678');
  assert.strictEqual(state.raw, 1);
  assert.strictEqual(state.upserts.length, 1);
  const days = (new Date(res.body.data.validUntil) - Date.now()) / 86400000;
  assert.ok(days > 29.9 && days <= 30);
  assert.strictEqual(redis.dels.length, 1);
});

test('link without membership only links', async () => {
  const { state, app } = setup();
  const res = await (await adminAgent(app)).post(linkUrl(PAY_ID)).send({ phone: '+919812345678', grantMembership: false });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.validUntil, null);
  assert.strictEqual(state.raw, 1);
  assert.strictEqual(state.upserts.length, 0);
});

test('link errors: already linked 409, race 409, unknown member 404, founder number 422, bad input 422', async () => {
  const { state, app } = setup();
  const agent = await adminAgent(app);
  assert.strictEqual((await agent.post(linkUrl(LINKED_ID)).send({ phone: '9812345678' })).status, 409);
  state.rawResult = 0;
  assert.strictEqual((await agent.post(linkUrl(PAY_ID)).send({ phone: '9812345678' })).status, 409);
  assert.strictEqual(state.upserts.length, 0);
  assert.strictEqual((await agent.post(linkUrl(PAY_ID)).send({ phone: '9811111111' })).status, 404);
  assert.strictEqual((await agent.post(linkUrl(PAY_ID)).send({ phone: '6283380110' })).status, 422);
  assert.strictEqual((await agent.post(linkUrl(PAY_ID)).send({ phone: '12345' })).status, 422);
  assert.strictEqual((await agent.post(linkUrl('nope')).send({ phone: '9812345678' })).status, 422);
});

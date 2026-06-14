'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const CS_ID = '22222222-2222-2222-2222-222222222222';
const CITY_ID = '44444444-4444-4444-4444-444444444444';

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  razorpay: { keyId: 'rzp_test_x', keySecret: 'x'.repeat(16), webhookSecret: 'w'.repeat(16) },
};

function fakeRedis() {
  const m = new Map();
  return {
    async ttl() { return -2; },
    async eval(_s, _n, k) { const c = (m.get(k) || 0) + 1; m.set(k, c); return c; },
    async set() { return 'OK'; }, async get() { return null; }, async del() { return 0; },
  };
}

const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };
const CS_ROW = { id: CS_ID, rawText: 'amballa', occurrenceCount: 3, createdAt: new Date(), suggestedCity: { id: CITY_ID, canonicalName: 'Ambala' } };

function fakePrisma() {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    async $queryRaw() { return [{ city_id: CITY_ID, canonical_name: 'Ambala' }]; },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    unresolvedCityString: {
      async findMany() { return [CS_ROW]; },
      async count() { return 1; },
      async findFirst({ where }) { return where.id === CS_ID ? { ...CS_ROW } : null; },
      async update({ where, data }) { return { id: where.id, ...data }; },
    },
    cityAlias: { async create({ data }) { return { id: 'alias-1', ...data }; } },
    city: { async findFirst({ where }) { return where.id === CITY_ID ? { id: CITY_ID } : null; } },
  };
}

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const surepass = { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } };

function app() {
  return buildApp({
    prisma: fakePrisma(), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, razorpay: { async createOrder() { return { id: 'o' }; } }, surepass,
  });
}

async function adminAgent() {
  const agent = request.agent(app());
  await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  return agent;
}

test('GET /admin/city-strings without a session → 401', async () => {
  const res = await request(app()).get('/api/v1/admin/city-strings');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('GET /admin/city-strings returns the queue envelope + meta', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/city-strings');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.meta, { page: 1, limit: 20, total: 1 });
  const row = res.body.data.cityStrings[0];
  assert.strictEqual(row.rawText, 'amballa');
  assert.strictEqual(row.suggestedCity.canonicalName, 'Ambala');
});

test('GET /admin/city-strings/cities?q= reuses the city typeahead', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/city-strings/cities?q=amb');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.cities[0].canonicalName, 'Ambala');
});

test('PATCH /admin/city-strings/:id resolve → 200', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/city-strings/${CS_ID}`).send({ action: 'resolve', cityId: CITY_ID });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.action, 'resolve');
});

test('PATCH /admin/city-strings/:id dismiss → 200', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/city-strings/${CS_ID}`).send({ action: 'dismiss' });
  assert.strictEqual(res.status, 200);
});

test('PATCH resolve without a cityId → 422', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/city-strings/${CS_ID}`).send({ action: 'resolve' });
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('PATCH on an unknown id → 404', async () => {
  const agent = await adminAgent();
  const res = await agent.patch('/api/v1/admin/city-strings/33333333-3333-3333-3333-333333333333').send({ action: 'dismiss' });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});

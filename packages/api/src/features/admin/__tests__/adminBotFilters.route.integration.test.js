'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const ENTRY_ID = '22222222-2222-2222-2222-222222222222';

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  razorpay: { keyId: 'rzp_test_x', keySecret: 'x'.repeat(16), webhookSecret: 'w'.repeat(16) },
};

const published = [];

function fakeRedis() {
  const m = new Map();
  return {
    async ttl() { return -2; },
    async eval(_s, _n, k) { const c = (m.get(k) || 0) + 1; m.set(k, c); return c; },
    async set() { return 'OK'; }, async get() { return null; }, async del() { return 0; },
    async publish(ch, msg) { published.push([ch, msg]); return 1; },
  };
}

const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };
const ENTRY = { id: ENTRY_ID, list: 'ignore_keyword', value: 'khali', createdAt: new Date() };

function fakePrisma() {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    botFilterEntry: {
      async findMany() { return [ENTRY]; },
      async count({ where }) { return where.value ? 1 : 5; },
      async createMany({ data }) { return { count: data.length }; },
      async findUnique({ where }) { return where.id === ENTRY_ID ? { ...ENTRY } : null; },
      async delete() { return ENTRY; },
    },
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

test('GET /admin/bot-filters without a session → 401', async () => {
  const res = await request(app()).get('/api/v1/admin/bot-filters?list=branding');
  assert.strictEqual(res.status, 401);
});

test('GET /admin/bot-filters returns one list with meta', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/bot-filters?list=ignore_keyword');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.meta, { page: 1, limit: 50, total: 5 });
  assert.strictEqual(res.body.data.entries[0].value, 'khali');
});

test('GET without or with an unknown list → 422', async () => {
  const agent = await adminAgent();
  assert.strictEqual((await agent.get('/api/v1/admin/bot-filters')).status, 422);
  assert.strictEqual((await agent.get('/api/v1/admin/bot-filters?list=nope')).status, 422);
});

test('POST numbers → 201, parsed, and the bot is notified', async () => {
  published.length = 0;
  const agent = await adminAgent();
  const res = await agent.post('/api/v1/admin/bot-filters').send({ list: 'blocked_phone', value: '+91 98765 43210, 09876543211' });
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(res.body.data, { added: 2, duplicates: 0, invalid: [], peers: [] });
  assert.strictEqual(published.length, 1);
});

test('POST an over-long value → 422', async () => {
  const agent = await adminAgent();
  const res = await agent.post('/api/v1/admin/bot-filters').send({ list: 'ignore_keyword', value: 'x'.repeat(501) });
  assert.strictEqual(res.status, 422);
});

test('DELETE → 200; unknown id → 404', async () => {
  const agent = await adminAgent();
  assert.strictEqual((await agent.delete(`/api/v1/admin/bot-filters/${ENTRY_ID}`)).status, 200);
  const res = await agent.delete('/api/v1/admin/bot-filters/33333333-3333-3333-3333-333333333333');
  assert.strictEqual(res.status, 404);
});

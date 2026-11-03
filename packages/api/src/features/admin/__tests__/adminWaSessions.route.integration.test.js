'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const SESSION_ID = '22222222-2222-2222-2222-222222222222';

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  cashfree: { secretKey: 'x'.repeat(16) },
};

const published = [];
const updates = [];

function fakeRedis() {
  const kv = new Map();
  const counters = new Map();
  return {
    kv,
    async ttl() { return -2; },
    async eval(_s, _n, k) { const c = (counters.get(k) || 0) + 1; counters.set(k, c); return c; },
    async set(k, v) { kv.set(k, v); return 'OK'; },
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async del(...ks) { ks.forEach((k) => kv.delete(k)); return ks.length; },
    async hgetall() { return {}; },
    async hget() { return null; },
    async hdel() { return 0; },
    async scard() { return 0; },
    async smembers() { return ['g1@g.us']; },
    async sunion() { return []; },
    async sdiff() { return []; },
    async publish(ch, msg) { published.push([ch, msg]); return 1; },
  };
}

const SESSION = { id: SESSION_ID, slot: 'wa-1', name: 'Punjab 1', enabled: true, phone: '919999999999', ridesSaved: 12 };
const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };

function fakePrisma() {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    waSession: {
      async findMany() { return [SESSION]; },
      async count() { return 1; },
      async findUnique({ where }) { return where.id === SESSION_ID || where.slot === SESSION.slot ? SESSION : null; },
      async create({ data }) { return { ...SESSION, ...data, id: 'new' }; },
      async updateMany(args) { updates.push(args); return { count: args.where.id === SESSION_ID ? 1 : 0 }; },
      async delete() { return SESSION; },
    },
    waGroup: { async findMany() { return [{ jid: 'g1@g.us', name: 'Taxi Ambala', participants: 90, enabled: true }]; } },
    city: { async findMany() { return []; } },
  };
}

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const surepass = { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } };

function app() {
  return buildApp({
    prisma: fakePrisma(), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, cashfree: { async createOrder() { return { id: 'o' }; } }, surepass,
  });
}

async function adminAgent() {
  const agent = request.agent(app());
  await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  return agent;
}

const BASE = '/api/v1/admin/wa-sessions';

test('admin session routes need an admin', async () => {
  assert.strictEqual((await request(app()).get(BASE)).status, 401);
});

test('GET lists sessions with status + stats', async () => {
  const agent = await adminAgent();
  const res = await agent.get(BASE);
  assert.strictEqual(res.status, 200);
  const [s] = res.body.data.sessions;
  assert.strictEqual(s.name, 'Punjab 1');
  assert.strictEqual(s.status, 'offline'); // paired, but no bot heartbeat in this test
  assert.strictEqual(s.rides24h, 0);
});

test('POST creates (201), validates the name (422)', async () => {
  const agent = await adminAgent();
  published.length = 0;
  const res = await agent.post(BASE).send({ name: 'Haryana' });
  assert.strictEqual(res.status, 201);
  assert.match(res.body.data.session.slot, /^wa-/);
  assert.strictEqual(published[0][0], 'easecab:bot:sessions:changed');
  assert.strictEqual((await agent.post(BASE).send({ name: '' })).status, 422);
});

test('PATCH renames / pauses; unknown id → 404; empty body → 422', async () => {
  const agent = await adminAgent();
  assert.strictEqual((await agent.patch(`${BASE}/${SESSION_ID}`).send({ enabled: false })).status, 200);
  assert.strictEqual((await agent.patch(`${BASE}/33333333-3333-3333-3333-333333333333`).send({ name: 'x' })).status, 404);
  assert.strictEqual((await agent.patch(`${BASE}/${SESSION_ID}`).send({})).status, 422);
});

test('analytics by period (bad period → 422), reset, and the group list', async () => {
  const agent = await adminAgent();
  const res = await agent.get(`${BASE}/${SESSION_ID}/analytics?period=week`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.total, 0);
  assert.strictEqual((await agent.get(`${BASE}/${SESSION_ID}/analytics?period=year`)).status, 422);
  assert.strictEqual((await agent.post(`${BASE}/${SESSION_ID}/analytics/reset`)).status, 200);
  const groups = await agent.get(`${BASE}/${SESSION_ID}/groups`);
  assert.deepStrictEqual(groups.body.data.groups.map((g) => g.name), ['Taxi Ambala']);
});

test('pair by phone publishes the command; bad phone → 422', async () => {
  const agent = await adminAgent();
  published.length = 0;
  const res = await agent.post(`${BASE}/${SESSION_ID}/pair`).send({ phone: '98765 43210' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(published, [['easecab:bot:pair:cmd', JSON.stringify({ slot: 'wa-1', phone: '919876543210' })]]);
  assert.strictEqual((await agent.get(`${BASE}/${SESSION_ID}/pair`)).body.data.status, 'starting');
  assert.strictEqual((await agent.post(`${BASE}/${SESSION_ID}/pair`).send({ phone: '123' })).status, 422);
});

test('share link opens the public pairing page without login; junk tokens → 422/404', async () => {
  const agent = await adminAgent();
  const { token } = (await agent.post(`${BASE}/${SESSION_ID}/share`)).body.data;
  const pub = agent; // same app instance (shares the fake redis)
  const res = await pub.get(`/api/v1/wa-pair/${token}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.name, 'Punjab 1');
  assert.strictEqual(res.body.data.phone, undefined);
  assert.strictEqual((await pub.post(`/api/v1/wa-pair/${token}`).send({})).status, 200);
  assert.strictEqual((await pub.get('/api/v1/wa-pair/bad')).status, 422);
  assert.strictEqual((await pub.get(`/api/v1/wa-pair/${'A'.repeat(32)}`)).status, 404);
});

test('the public pairing endpoint is IP rate-limited', async () => {
  const pub = request(app());
  let last;
  for (let i = 0; i <= 30; i += 1) last = await pub.get(`/api/v1/wa-pair/${'A'.repeat(32)}`);
  assert.strictEqual(last.status, 429);
});

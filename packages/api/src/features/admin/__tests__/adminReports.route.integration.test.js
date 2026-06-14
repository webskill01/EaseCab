'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

// bcrypt hash of "admin-pass-123" (bcryptjs, 10 rounds) — same as the other admin tests.
const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const REPORT_ID = '11111111-1111-1111-1111-111111111111';
const RIDE_ID = '22222222-2222-2222-2222-222222222222';

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
    async set() { return 'OK'; },
    async get() { return null; },
    async del() { return 0; },
  };
}

const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };
const REPORT_ROW = {
  id: REPORT_ID, reason: 'spam', remarks: 'junk', screenshotUrl: null, createdAt: new Date(), reviewedAt: null,
  reporter: { id: 'u1', name: 'Reporter', phone: '+919876543210' },
  ride: { id: RIDE_ID, displayText: 'A to B', status: 'fresh', pickupRaw: 'a', dropRaw: 'b', pickupCity: null, dropCity: null },
  postedRide: null,
};

function fakePrisma() {
  return {
    async $transaction(arg) {
      if (typeof arg === 'function') return arg(this);
      return Promise.all(arg);
    },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    rideReport: {
      async findMany() { return [REPORT_ROW]; },
      async count() { return 1; },
      async findUnique({ where }) { return where.id === REPORT_ID ? { id: REPORT_ID, rideId: RIDE_ID, postedRideId: null } : null; },
      async updateMany() { return { count: 1 }; },
    },
    ride: { async update({ where, data }) { return { id: where.id, ...data }; } },
    postedRide: { async update({ where, data }) { return { id: where.id, ...data }; } },
  };
}

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const surepass = { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } };

function app() {
  return buildApp({
    prisma: fakePrisma(),
    redis: fakeRedis(),
    logger: pino({ level: 'silent' }),
    config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber,
    razorpay: { async createOrder() { return { id: 'o' }; } },
    surepass,
  });
}

async function adminAgent() {
  const agent = request.agent(app());
  await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  return agent;
}

test('GET /admin/reports without a session → 401', async () => {
  const res = await request(app()).get('/api/v1/admin/reports');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('GET /admin/reports returns the queue envelope + meta', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/reports');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.meta, { page: 1, limit: 20, total: 1 });
  const item = res.body.data.reports[0];
  assert.strictEqual(item.id, REPORT_ID);
  assert.strictEqual(item.reporter.phoneMasked, '••••3210');
  assert.strictEqual(item.reporter.phone, undefined);
  assert.strictEqual(item.target.kind, 'bot');
});

test('PATCH /admin/reports/:id with a bad action → 422', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/reports/${REPORT_ID}`).send({ action: 'delete' });
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('PATCH /admin/reports/:id remove → 200 with resolved count', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/reports/${REPORT_ID}`).send({ action: 'remove' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.report.action, 'remove');
  assert.strictEqual(res.body.data.report.resolved, 1);
});

test('PATCH /admin/reports/:id on an unknown id → 404', async () => {
  const agent = await adminAgent();
  const res = await agent.patch('/api/v1/admin/reports/33333333-3333-3333-3333-333333333333').send({ action: 'dismiss' });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});

test('a non-admin cannot reach the reports queue (garbage cookie)', async () => {
  const res = await request(app()).get('/api/v1/admin/reports').set('Cookie', ['ec_admin_at=garbage']);
  assert.strictEqual(res.status, 401);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const USER_ID = '22222222-2222-2222-2222-222222222222';

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
const USER_ROW = {
  id: USER_ID, name: 'Gurpreet', phone: '+919876543210', aadhaarVerified: true,
  verificationStatus: 'approved', baseCity: 'Amritsar', vehicleType: 'sedan',
  createdAt: new Date(), isDeleted: false, deletedAt: null,
  subscription: { status: 'trial', expiresAt: null, trialExpiresAt: new Date('2026-07-01') },
};

function fakePrisma() {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    user: {
      async findMany() { return [USER_ROW]; },
      async count() { return 1; },
      async findUnique({ where }) { return where.id === USER_ID ? { ...USER_ROW } : null; },
      async update({ where, data }) { return { ...USER_ROW, id: where.id, ...data }; },
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

test('GET /admin/users without a session → 401', async () => {
  const res = await request(app()).get('/api/v1/admin/users');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('GET /admin/users returns the directory envelope + meta with masked phone', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/users');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.meta, { page: 1, limit: 20, total: 1 });
  const u = res.body.data.users[0];
  assert.strictEqual(u.phoneMasked, '••••3210');
  assert.strictEqual(u.phone, undefined);
  assert.strictEqual(u.subscription.status, 'trial');
});

test('GET /admin/users with a bad status → 422', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/users?status=gone');
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('PATCH /admin/users/:userId delete → 200, isDeleted true', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/users/${USER_ID}`).send({ action: 'delete' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.user.isDeleted, true);
});

test('PATCH /admin/users/:userId with a bad action → 422', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/users/${USER_ID}`).send({ action: 'nuke' });
  assert.strictEqual(res.status, 422);
});

test('PATCH /admin/users/:userId on an unknown id → 404', async () => {
  const agent = await adminAgent();
  const res = await agent.patch('/api/v1/admin/users/33333333-3333-3333-3333-333333333333').send({ action: 'restore' });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});

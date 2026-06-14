'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

// bcrypt hash of "admin-pass-123" (bcryptjs, 10 rounds) — same as adminAuth test.
const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const SUB_ID = '11111111-1111-1111-1111-111111111111';
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
    async set() { return 'OK'; },
    async get() { return null; },
    async del() { return 0; },
  };
}

const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };
const SUBMISSION_ROW = {
  id: SUB_ID, docType: 'dl', status: 'submitted', surepassRef: 'ref', verifiedName: 'A B', createdAt: new Date(),
  user: {
    id: USER_ID, name: 'A B', phone: '+919876543210', aadhaarLast4: '1234',
    carMake: 'Maruti', carModel: 'Dzire', carRegNo: 'PB01', verificationStatus: 'submitted',
    profilePicUrl: null, licenseUrl: null, rcUrl: null, carFrontUrl: null, carBackUrl: null,
  },
};

function fakePrisma() {
  return {
    async $transaction(arr) { return Promise.all(arr); },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    verificationSubmission: {
      async findMany() { return [SUBMISSION_ROW]; },
      async count() { return 1; },
      async findUnique({ where }) { return where.id === SUB_ID ? { id: SUB_ID, status: 'submitted' } : null; },
      async update({ where, data }) { return { id: where.id, ...data }; },
    },
    user: { async update({ where, data }) { return { id: where.id, ...data }; } },
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

/** Logged-in admin agent (cookies set by the real login flow). */
async function adminAgent() {
  const agent = request.agent(app());
  await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  return agent;
}

test('GET /admin/verifications without a session → 401', async () => {
  const res = await request(app()).get('/api/v1/admin/verifications');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('GET /admin/verifications returns the queue envelope + meta', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/verifications');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.deepStrictEqual(res.body.meta, { page: 1, limit: 20, total: 1 });
  const item = res.body.data.verifications[0];
  assert.strictEqual(item.id, SUB_ID);
  assert.strictEqual(item.docType, 'dl');
  assert.strictEqual(item.user.phoneMasked, '••••3210');
  assert.strictEqual(item.user.phone, undefined); // raw phone never leaves the service
  assert.strictEqual(item.images.licence, null);  // no r2 in this harness
});

test('PATCH /admin/verifications/:id reject without a reason → 422', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/verifications/${SUB_ID}`).send({ action: 'reject' });
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('PATCH /admin/verifications/:id approve → 200 approved', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/verifications/${SUB_ID}`).send({ action: 'approve' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.verification.status, 'approved');
});

test('PATCH /admin/verifications/:id on an unknown id → 404', async () => {
  const agent = await adminAgent();
  const res = await agent.patch('/api/v1/admin/verifications/33333333-3333-3333-3333-333333333333').send({ action: 'approve' });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});

test('PATCH /admin/verifications/badge/:userId sets the rollup', async () => {
  const agent = await adminAgent();
  const res = await agent.patch(`/api/v1/admin/verifications/badge/${USER_ID}`).send({ status: 'approved' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.updated, true);
});

test('a non-admin cannot reach the queue (garbage cookie)', async () => {
  const res = await request(app()).get('/api/v1/admin/verifications').set('Cookie', ['ec_admin_at=garbage']);
  assert.strictEqual(res.status, 401);
});

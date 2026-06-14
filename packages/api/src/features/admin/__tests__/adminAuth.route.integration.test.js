'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

// bcrypt hash of "admin-pass-123" (generated with bcryptjs, 10 rounds).
const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';

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
function fakePrisma() {
  return {
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
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

test('login → sets ec_admin_at + ec_admin_rt httpOnly; /me returns the admin', async () => {
  const agent = request.agent(app());
  const login = await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  assert.strictEqual(login.status, 200);
  assert.strictEqual(login.body.data.admin.role, 'super');
  assert.strictEqual(login.body.data.admin.passwordHash, undefined);
  const cookies = login.headers['set-cookie'].join(';');
  assert.match(cookies, /ec_admin_at=/);
  assert.match(cookies, /ec_admin_rt=/);
  assert.match(cookies, /HttpOnly/i);

  const me = await agent.get('/api/v1/admin/auth/me');
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.data.admin.email, 'admin@easecab.com');
  assert.strictEqual(me.body.data.admin.id, 'adm1');
});

test('wrong password → 401 AUTH_REQUIRED, no cookies set', async () => {
  const res = await request(app()).post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'wrong-password' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
  assert.strictEqual(res.headers['set-cookie'], undefined);
});

test('a malformed body → 422 VALIDATION_ERROR', async () => {
  const res = await request(app()).post('/api/v1/admin/auth/login').send({ email: 'x', password: '1' });
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('/me without a session → 401', async () => {
  const res = await request(app()).get('/api/v1/admin/auth/me');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('a garbage admin cookie cannot reach /me', async () => {
  const res = await request(app()).get('/api/v1/admin/auth/me').set('Cookie', ['ec_admin_at=garbage']);
  assert.strictEqual(res.status, 401);
});

test('logout clears both admin cookies', async () => {
  const res = await request(app()).post('/api/v1/admin/auth/logout');
  assert.strictEqual(res.status, 200);
  const cookies = res.headers['set-cookie'].join(';');
  assert.match(cookies, /ec_admin_at=;/);
  assert.match(cookies, /ec_admin_rt=;/);
});

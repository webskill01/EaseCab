'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
};

// Minimal in-memory fakes so the test exercises route→service→repo wiring + cookies.
function fakeRedis() {
  const store = new Map();
  return {
    async ttl(k) { return store.has(k) ? store.get(k).ttl : -2; },
    async incr(k) { const c = store.get(k) || { value: 0, ttl: -1 }; c.value += 1; store.set(k, c); return c.value; },
    async expire(k, s) { if (store.has(k)) store.get(k).ttl = s; return 1; },
    async set(k, v, _m, s) { store.set(k, { value: v, ttl: s }); return 'OK'; },
  };
}
function fakePrisma() {
  const byPhone = new Map();
  let seq = 0;
  return {
    user: {
      async findUnique({ where }) { return byPhone.get(where.phone) || null; },
      async findFirst({ where }) {
        for (const u of byPhone.values()) if (u.id === where.id && u.isDeleted === false) return u;
        return null;
      },
      async create({ data }) {
        const u = { id: `u${++seq}`, phone: data.phone, name: null, verificationStatus: 'none', isDeleted: false,
          subscription: { status: 'trial', trialExpiresAt: data.subscription.create.trialExpiresAt, expiresAt: null } };
        byPhone.set(u.phone, u); return u;
      },
      async update({ where, data }) {
        for (const u of byPhone.values()) if (u.id === where.id) { Object.assign(u, data); return u; }
        return null;
      },
    },
  };
}

function appWith(identity) {
  return buildApp({ prisma: fakePrisma(), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG, identity });
}

const okIdentity = { verifyOtpToken: async () => ({ phone: '+919876543210' }) };

test('POST /api/v1/auth/send-otp returns the success envelope', async () => {
  const res = await request(appWith(okIdentity)).post('/api/v1/auth/send-otp').send({ phone: '+919876543210' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { success: true, data: { sent: true } });
});

test('send-otp rejects a bad phone with 422 VALIDATION_ERROR', async () => {
  const res = await request(appWith(okIdentity)).post('/api/v1/auth/send-otp').send({ phone: '12345' });
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

test('send-otp enforces the 30s resend cooldown with 429', async () => {
  const app = appWith(okIdentity);
  await request(app).post('/api/v1/auth/send-otp').send({ phone: '+919876543210' });
  const res = await request(app).post('/api/v1/auth/send-otp').send({ phone: '+919876543210' });
  assert.strictEqual(res.status, 429);
  assert.strictEqual(res.body.error.code, 'RATE_LIMITED');
});

test('verify-otp creates a trial user, returns 201 + sets both httpOnly cookies', async () => {
  const res = await request(appWith(okIdentity)).post('/api/v1/auth/verify-otp').send({ idToken: 'x'.repeat(20) });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.user.phone, '+919876543210');
  assert.strictEqual(res.body.data.user.subscription.status, 'trial');
  const cookies = res.headers['set-cookie'].join(';');
  assert.match(cookies, /ec_at=.*HttpOnly/i);
  assert.match(cookies, /ec_rt=.*HttpOnly/i);
});

test('verify-otp with a Firebase failure returns 401 AUTH_REQUIRED and no cookies', async () => {
  const badIdentity = { verifyOtpToken: async () => { throw new Error('boom'); } };
  const res = await request(appWith(badIdentity)).post('/api/v1/auth/verify-otp').send({ idToken: 'x'.repeat(20) });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
  assert.strictEqual(res.headers['set-cookie'], undefined);
});

test('refresh with no cookie → 401; logout clears cookies → 200', async () => {
  const app = appWith(okIdentity);
  const noCookie = await request(app).post('/api/v1/auth/refresh').send();
  assert.strictEqual(noCookie.status, 401);

  const out = await request(app).post('/api/v1/auth/logout').send();
  assert.strictEqual(out.status, 200);
  assert.deepStrictEqual(out.body, { success: true, data: { loggedOut: true } });
  assert.match(out.headers['set-cookie'].join(';'), /ec_at=;/); // cleared
});

test('full round-trip: verify-otp → reuse refresh cookie → refresh issues new tokens', async () => {
  const app = appWith(okIdentity);
  const verified = await request(app).post('/api/v1/auth/verify-otp').send({ idToken: 'x'.repeat(20) });
  const cookie = verified.headers['set-cookie'];
  const refreshed = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).send();
  assert.strictEqual(refreshed.status, 200);
  assert.deepStrictEqual(refreshed.body, { success: true, data: { refreshed: true } });
  assert.match(refreshed.headers['set-cookie'].join(';'), /ec_at=.*HttpOnly/i);
});

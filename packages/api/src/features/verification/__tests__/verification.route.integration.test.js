'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES } = require('@easecab/shared');
const { buildApp } = require('../../../app');
const { createJwt } = require('../../../lib/jwt');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'], cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  razorpay: { keyId: 'rzp_test_x', keySecret: 's'.repeat(16), webhookSecret: 'w'.repeat(16) },
};
const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const jwt = createJwt(CONFIG.jwt);
const authCookie = `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: 'u1', role: 'user' })}`;

function fakeRedis() { const c = new Map(); return { async eval(_s, _n, k) { c.set(k, (c.get(k) || 0) + 1); return c.get(k); } }; }
function fakePrisma() {
  const user = { id: 'u1', aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'none' };
  const subs = [];
  return {
    _user: user, _subs: subs,
    verificationSubmission: { async create({ data }) { const r = { id: `s${subs.length + 1}`, ...data }; subs.push(r); return r; } },
    user: {
      async findUnique() { return { aadhaarVerified: user.aadhaarVerified, dlSubmitted: user.dlSubmitted, rcSubmitted: user.rcSubmitted, verificationStatus: user.verificationStatus }; },
      async update({ data }) { Object.assign(user, data); return user; },
      async updateMany({ where, data }) { if (user.verificationStatus === where.verificationStatus) { Object.assign(user, data); return { count: 1 }; } return { count: 0 }; },
    },
    async $transaction(fn) { return fn(this); },
  };
}
function appWith(prisma, surepass) {
  return buildApp({
    prisma, redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+919876543210' }) },
    subscriber: inertSubscriber,
    razorpay: { async createOrder() { return { id: 'order_new' }; } },
    surepass,
  });
}
const okSurepass = {
  async generateAadhaarOtp() { return { clientId: 'cl_1' }; },
  async submitAadhaarOtp() { return { success: true, name: 'A USER' }; },
  async verifyDl() { return { success: true, name: 'A USER', ref: 'dl_1' }; },
  async verifyRc() { return { success: true, name: 'A USER', ref: 'rc_1' }; },
};

test('POST /verification/aadhaar/otp requires auth', async () => {
  const res = await request(appWith(fakePrisma(), okSurepass)).post('/api/v1/verification/aadhaar/otp').send({ aadhaarNumber: '123456789012' });
  assert.strictEqual(res.status, 401);
});

test('aadhaar otp → verify flips the flag + promotes to submitted', async () => {
  const prisma = fakePrisma(); const app = appWith(prisma, okSurepass);
  const otp = await request(app).post('/api/v1/verification/aadhaar/otp').set('Cookie', authCookie).send({ aadhaarNumber: '123456789012' });
  assert.strictEqual(otp.body.data.clientId, 'cl_1');
  const v = await request(app).post('/api/v1/verification/aadhaar/verify').set('Cookie', authCookie).send({ clientId: 'cl_1', otp: '123456' });
  assert.strictEqual(v.status, 200);
  assert.strictEqual(prisma._user.aadhaarVerified, true);
  assert.strictEqual(prisma._user.verificationStatus, 'submitted');
});

test('a failed Surepass DL → 422, no flag flip', async () => {
  const prisma = fakePrisma();
  const app = appWith(prisma, { ...okSurepass, async verifyDl() { return { success: false, name: null, ref: null }; } });
  const res = await request(app).post('/api/v1/verification/dl').set('Cookie', authCookie).send({ dlNumber: 'PB1020200012345', dob: '1990-05-20' });
  assert.strictEqual(res.status, 422);
  assert.strictEqual(prisma._user.dlSubmitted, false);
});

test('invalid body → 422 before any Surepass call', async () => {
  const res = await request(appWith(fakePrisma(), okSurepass)).post('/api/v1/verification/rc').set('Cookie', authCookie).send({ rcNumber: 'x' });
  assert.strictEqual(res.status, 422);
});

test('GET /verification/me returns the snapshot', async () => {
  const res = await request(appWith(fakePrisma(), okSurepass)).get('/api/v1/verification/me').set('Cookie', authCookie);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.verificationStatus, 'none');
});

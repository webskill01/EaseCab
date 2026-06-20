'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES } = require('@easecab/shared');
const { buildApp } = require('../../../app');
const { createJwt } = require('../../../lib/jwt');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  razorpay: { keyId: 'rzp_test_x', keySecret: 'x'.repeat(16), webhookSecret: 'w'.repeat(16) },
};
const jwt = createJwt(CONFIG.jwt);
const cookieFor = (id) => `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: id, role: 'user' })}`;
const UUID = '11111111-1111-1111-1111-111111111111';

function project(row, select) { if (!select) return row; const o = {}; for (const k of Object.keys(select)) o[k] = row[k] ?? null; return o; }

/** In-memory prisma supporting user.findFirst (the only query the users route hits). */
function fakePrisma(users = []) {
  return {
    user: {
      async findFirst({ where, select }) {
        const u = users.find((r) => r.id === where.id && (where.isDeleted === undefined || r.isDeleted === where.isDeleted));
        return u ? project(u, select) : null;
      },
    },
    subscription: { async findUnique() { return null; } },
  };
}
function fakeRedis() { return { async eval() { return 1; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; } }; }

function makeApp(users) {
  return buildApp({
    prisma: fakePrisma(users), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    razorpay: { async createOrder() { return { id: 'order_x' }; } },
    surepass: { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } },
    uploads: { presignPost: async () => ({}), presignGet: async () => '', headObject: async () => ({}), publicUrl: (k) => k },
  });
}

const POSTER = {
  id: UUID, phone: '+919876500000', name: 'Gurpreet', profilePicUrl: null, baseCity: 'Ludhiana',
  vehicleType: 'Innova', carMake: 'Toyota', carModel: 'Innova', experience: 3, bio: 'Punjab driver',
  languagesSpoken: ['pa'], createdAt: new Date('2026-01-01T00:00:00Z'), aadhaarVerified: true,
  dlSubmitted: true, rcSubmitted: true, verificationStatus: 'approved', isDeleted: false,
};

test('GET /users/:id/profile → public profile, no phone', async () => {
  const res = await request(makeApp([POSTER])).get(`/api/v1/users/${UUID}/profile`).set('Cookie', cookieFor('me'));
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.name, 'Gurpreet');
  assert.equal(res.body.data.verifiedDriver, true);
  assert.equal('phone' in res.body.data, false);
});

test('GET /users/:id/profile → 404 for a soft-deleted user', async () => {
  const res = await request(makeApp([{ ...POSTER, isDeleted: true }])).get(`/api/v1/users/${UUID}/profile`).set('Cookie', cookieFor('me'));
  assert.equal(res.status, 404);
});

test('GET /users/:id/profile → 401 unauthenticated', async () => {
  const res = await request(makeApp([POSTER])).get(`/api/v1/users/${UUID}/profile`);
  assert.equal(res.status, 401);
});

test('GET /users/:id/profile → 422 for a non-UUID id', async () => {
  const res = await request(makeApp([POSTER])).get('/api/v1/users/not-a-uuid/profile').set('Cookie', cookieFor('me'));
  assert.equal(res.status, 422);
});

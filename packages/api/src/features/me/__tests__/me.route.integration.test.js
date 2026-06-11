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

/** In-memory prisma exposing the rideContact.findMany the /me/contacted read needs. */
function fakePrisma(rows = []) {
  function project(row, select) { if (!select) return row; const o = {}; for (const k of Object.keys(select)) o[k] = row[k] ?? null; return o; }
  return {
    user: { async findUnique() { return null; } },
    subscription: { async findUnique() { return null; } },
    rideContact: {
      async findMany({ where, take, select }) {
        let list = rows.filter((r) => r.userId === where.userId && r.source !== null && r.source !== undefined);
        if (where.OR) {
          const { contactedAt, id } = whereKey(where.OR);
          list = list.filter((r) => r.contactedAt < contactedAt || (Number(r.contactedAt) === Number(contactedAt) && r.id < id));
        }
        list.sort((a, b) => b.contactedAt - a.contactedAt || (a.id < b.id ? 1 : -1));
        return list.slice(0, take).map((r) => project(r, select));
      },
    },
  };
}
/** Pull the keyset out of the repo's OR clause [{contactedAt:{lt}}, {contactedAt, id:{lt}}]. */
function whereKey(or) {
  return { contactedAt: or[1].contactedAt, id: or[1].id.lt };
}

function fakeRedis() {
  return { async eval() { return 1; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; } };
}

function makeApp(rows) {
  return buildApp({
    prisma: fakePrisma(rows), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    razorpay: { async createOrder() { return { id: 'order_x' }; } },
    surepass: { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } },
  });
}

test("GET /me/contacted → the caller's snapshotted contacts (phone included)", async () => {
  const app = makeApp([
    { id: 'k1', userId: 'u1', source: 'bot', fromCityName: 'Ludhiana', toCityName: 'Delhi', vehicleType: 'Sedan', revealedPhone: '+919876500000', contactedAt: new Date('2026-06-11T10:00:00Z'), rideId: null, postedRideId: null },
    { id: 'k2', userId: 'other', source: 'posted', fromCityName: 'X', toCityName: 'Y', vehicleType: null, revealedPhone: '+910000000000', contactedAt: new Date(), rideId: null, postedRideId: null },
  ]);
  const res = await request(app).get('/api/v1/me/contacted').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.contacts.length, 1);
  assert.equal(res.body.data.contacts[0].phoneNumber, '+919876500000');
  assert.equal(res.body.data.contacts[0].source, 'bot');
});

test('GET /me/contacted → 401 unauthenticated', async () => {
  const res = await request(makeApp([])).get('/api/v1/me/contacted');
  assert.equal(res.status, 401);
});

test('GET /me/contacted?cursor=bad → 422', async () => {
  const res = await request(makeApp([])).get('/api/v1/me/contacted?cursor=%%%').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 422);
});

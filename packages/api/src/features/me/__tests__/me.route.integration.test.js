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

function project(row, select) { if (!select) return row; const o = {}; for (const k of Object.keys(select)) o[k] = row[k] ?? null; return o; }

/** In-memory prisma for /me reads + profile read/update (Step 21b). `userRow` is the
 * caller's mutable User row; `rows` are RideContact snapshots. */
function fakePrisma(rows = [], userRow = null) {
  const user = userRow ? { ...userRow } : null;
  return {
    user: {
      async findUnique({ select }) { return user ? project(user, select) : null; },
      async update({ data, select }) { Object.assign(user, data); return project(user, select); },
    },
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

/** R2 boundary stub — head returns a small in-policy image so verifyUpload passes. */
const uploadsStub = {
  presignPost: async () => ({ url: 'https://r2.example/post', fields: {} }),
  presignGet: async () => 'https://r2.example/get',
  headObject: async () => ({ exists: true, size: 1024, contentType: 'image/jpeg' }),
  publicUrl: (k) => `https://r2.example/${k}`,
};

function makeApp(rows, userRow = null) {
  return buildApp({
    prisma: fakePrisma(rows, userRow), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    razorpay: { async createOrder() { return { id: 'order_x' }; } },
    surepass: { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } },
    uploads: uploadsStub,
  });
}

const PROFILE_ROW = {
  id: 'u1', phone: '+910000000000', name: 'Gurpreet', bio: 'Punjab driver', baseCity: 'Ludhiana',
  vehicleType: 'Innova', profilePicUrl: 'https://r2.example/dp/u1/x.jpg', languagesSpoken: ['pa', 'hi'],
  aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false, verificationStatus: 'submitted',
  aadhaarLast4: '1234', carMake: null, carModel: null, carRegNo: null, carFrontUrl: null, carBackUrl: null,
};

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

test('GET /me/profile returns profileComplete + verification block', async () => {
  const res = await request(makeApp([], PROFILE_ROW)).get('/api/v1/me/profile').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.profileComplete, true);
  assert.equal(res.body.data.verification.aadhaarLast4, '1234');
});

test('PATCH /me/profile validates + persists editable fields', async () => {
  const res = await request(makeApp([], PROFILE_ROW)).patch('/api/v1/me/profile').set('Cookie', cookieFor('u1')).send({
    name: 'Gurpreet Singh', bio: 'Punjab driver, 8 yrs', baseCity: 'Ludhiana',
    vehicleType: 'Innova', languagesSpoken: ['pa', 'hi'],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.name, 'Gurpreet Singh');
});

test('PATCH /me/profile rejects an unknown vehicleType (422)', async () => {
  const res = await request(makeApp([], PROFILE_ROW)).patch('/api/v1/me/profile').set('Cookie', cookieFor('u1')).send({
    name: 'Gurpreet', bio: 'x', baseCity: 'Ludhiana', vehicleType: 'Spaceship', languagesSpoken: ['pa'],
  });
  assert.equal(res.status, 422);
});

test('POST /me/uploads rejects a key outside the caller prefix (422)', async () => {
  const res = await request(makeApp([], PROFILE_ROW)).post('/api/v1/me/uploads').set('Cookie', cookieFor('u1'))
    .send({ purpose: 'dp', key: 'dp/SOMEONE_ELSE/x.jpg' });
  assert.equal(res.status, 422);
});

test('POST /me/uploads attaches a verified car image → its URL field', async () => {
  const res = await request(makeApp([], PROFILE_ROW)).post('/api/v1/me/uploads').set('Cookie', cookieFor('u1'))
    .send({ purpose: 'car_front', key: 'car/u1/front.jpg' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.field, 'carFrontUrl');
  assert.equal(res.body.data.value, 'https://r2.example/car/u1/front.jpg');
});

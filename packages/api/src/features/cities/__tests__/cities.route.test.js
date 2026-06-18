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

function fakeRedis() {
  return { async eval() { return 1; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; } };
}

function makeApp(cityRows) {
  return buildApp({
    prisma: { async $queryRaw() { return cityRows; } },
    redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
  });
}

test('GET /api/v1/cities/nearest → 200 with the nearest city', async () => {
  const app = makeApp([{ city_id: 'c1', canonical_name: 'Chandigarh', distance_km: 4.2 }]);
  const res = await request(app).get('/api/v1/cities/nearest?lat=30.73&lng=76.78').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { success: true, data: { city: { id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4.2 } } });
});

test('GET /api/v1/cities/nearest → { city: null } when none in range', async () => {
  const app = makeApp([]);
  const res = await request(app).get('/api/v1/cities/nearest?lat=0&lng=0').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { city: null });
});

test('GET /api/v1/cities/nearest → 422 VALIDATION_ERROR for out-of-range lat', async () => {
  const app = makeApp([]);
  const res = await request(app).get('/api/v1/cities/nearest?lat=91&lng=0').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('GET /api/v1/cities/nearest → 401 without auth', async () => {
  const app = makeApp([]);
  const res = await request(app).get('/api/v1/cities/nearest?lat=30&lng=76');
  assert.equal(res.status, 401);
});

function makeAppWithCities(cityRows) {
  return buildApp({
    prisma: { async $queryRaw() { return []; }, city: { async findMany() { return cityRows; } } },
    redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
  });
}

test('GET /api/v1/cities/all → 200 with the full active-city list', async () => {
  const rows = [{ id: 'c1', canonicalName: 'Ambala', namePa: 'ਅੰਬਾਲਾ', nameHi: 'अंबाला' }];
  const app = makeAppWithCities(rows);
  const res = await request(app).get('/api/v1/cities/all').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { success: true, data: { cities: rows } });
});

test('GET /api/v1/cities/all → 401 without auth', async () => {
  const app = makeAppWithCities([]);
  const res = await request(app).get('/api/v1/cities/all');
  assert.equal(res.status, 401);
});

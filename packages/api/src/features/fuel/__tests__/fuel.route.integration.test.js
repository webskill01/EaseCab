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
  cashfree: { secretKey: 'x'.repeat(16) },
};
const jwt = createJwt(CONFIG.jwt);
const cookie = `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: 'u1', role: 'user' })}`;
const SID = '11111111-1111-4111-8111-111111111111';

function makeApp() {
  const seen = { where: null, created: [], reports: [] };
  const counters = new Map();
  const prisma = {
    fuelStation: {
      async findMany({ where }) {
        seen.where = where;
        return [
          { id: 'b', name: 'Far', brand: 'hpcl', lat: 30.36, lng: 76.3869, hasCng: true, hasPetrol: true, hasDiesel: true },
          { id: 'a', name: 'Near', brand: 'iocl', lat: 30.3408, lng: 76.3869, hasCng: true, hasPetrol: true, hasDiesel: true },
        ];
      },
      async create({ data }) { seen.created.push(data); return { id: 's-new', status: data.status, createdAt: new Date() }; },
      async findUnique({ where }) { return where.id === SID ? { id: SID, status: 'active', hasCng: false } : null; },
      async update() { return {}; },
    },
    city: { async findUnique({ where }) { return where.id === SID ? { lat: 30.3398, lng: 76.3869 } : null; } },
    fuelStationReport: { async upsert({ create }) { seen.reports.push(create); return { id: 'r1' }; } },
  };
  const redis = {
    async eval(_s, _n, key) { const n = (counters.get(key) || 0) + 1; counters.set(key, n); return n; },
    async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; },
  };
  const app = buildApp({
    prisma, redis, logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    cashfree: {}, surepass: {},
  });
  app.locals._seen = seen;
  return app;
}

test('GET /fuel/stations → 401 without auth', async () => {
  assert.strictEqual((await request(makeApp()).get('/api/v1/fuel/stations?lat=30.34&lng=76.39')).status, 401);
});

test('GET /fuel/stations → nearest first, filtered on the fuel column, active only', async () => {
  const app = makeApp();
  const res = await request(app).get('/api/v1/fuel/stations?lat=30.3398&lng=76.3869&fuel=diesel').set('Cookie', cookie);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.data.stations.map((s) => s.id), ['a', 'b']);
  assert.strictEqual(app.locals._seen.where.hasDiesel, true);
  assert.strictEqual(app.locals._seen.where.status, 'active');
});

test('GET /fuel/stations → 422 outside India or bad fuel', async () => {
  const app = makeApp();
  assert.strictEqual((await request(app).get('/api/v1/fuel/stations?lat=51.5&lng=-0.1').set('Cookie', cookie)).status, 422);
  assert.strictEqual((await request(app).get('/api/v1/fuel/stations?lat=30.3&lng=76.4&fuel=lpg').set('Cookie', cookie)).status, 422);
});

test('POST /fuel/stations → 201 pending; 6th add in a day → 429', async () => {
  const app = makeApp();
  const body = { name: 'Sandhu CNG', lat: 30.31, lng: 76.41, fuels: ['cng', 'petrol'] };
  for (let i = 0; i < 5; i += 1) {
    const res = await request(app).post('/api/v1/fuel/stations').set('Cookie', cookie).send(body);
    assert.strictEqual(res.status, 201);
  }
  assert.strictEqual(app.locals._seen.created[0].status, 'pending');
  assert.strictEqual(app.locals._seen.created[0].addedById, 'u1');
  assert.strictEqual((await request(app).post('/api/v1/fuel/stations').set('Cookie', cookie).send(body)).status, 429);
});

test('POST /fuel/stations → 422 on no fuels or unknown keys', async () => {
  const app = makeApp();
  assert.strictEqual((await request(app).post('/api/v1/fuel/stations').set('Cookie', cookie).send({ name: 'X pump', lat: 30.3, lng: 76.4, fuels: [] })).status, 422);
  assert.strictEqual((await request(app).post('/api/v1/fuel/stations').set('Cookie', cookie).send({ name: 'X pump', lat: 30.3, lng: 76.4, fuels: ['cng'], status: 'active' })).status, 422);
});

test('POST /fuel/stations/:id/reports → 201 queued; unknown station → 404; bad kind → 422', async () => {
  const app = makeApp();
  const ok = await request(app).post(`/api/v1/fuel/stations/${SID}/reports`).set('Cookie', cookie).send({ kind: 'cng_yes' });
  assert.strictEqual(ok.status, 201);
  assert.deepStrictEqual(ok.body.data, { stationId: SID, kind: 'cng_yes', applied: false });
  assert.deepStrictEqual(app.locals._seen.reports[0], { stationId: SID, userId: 'u1', kind: 'cng_yes', resolvedAt: null });
  const missing = await request(app).post('/api/v1/fuel/stations/22222222-2222-4222-8222-222222222222/reports').set('Cookie', cookie).send({ kind: 'closed' });
  assert.strictEqual(missing.status, 404);
  assert.strictEqual((await request(app).post(`/api/v1/fuel/stations/${SID}/reports`).set('Cookie', cookie).send({ kind: 'maybe' })).status, 422);
});

test('GET /fuel/stations?cityId → city centre + its pumps; 404 unknown city; 422 city + position', async () => {
  const app = makeApp();
  const res = await request(app).get(`/api/v1/fuel/stations?cityId=${SID}`).set('Cookie', cookie);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.data.center, { lat: 30.34, lng: 76.39 });
  assert.deepStrictEqual(res.body.data.stations.map((s) => s.id), ['a', 'b']);
  const missing = '22222222-2222-4222-8222-222222222222';
  assert.strictEqual((await request(app).get(`/api/v1/fuel/stations?cityId=${missing}`).set('Cookie', cookie)).status, 404);
  assert.strictEqual((await request(app).get(`/api/v1/fuel/stations?cityId=${SID}&lat=30.3&lng=76.4`).set('Cookie', cookie)).status, 422);
});

test('GET /fuel/route → pumps along a straight-line route; 422 without a from; 404 unknown city', async () => {
  const app = makeApp();
  const ok = await request(app).get(`/api/v1/fuel/route?fromLat=30.20&fromLng=76.3869&toCityId=${SID}&fuel=cng`).set('Cookie', cookie);
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.data.routes.length, 1);
  assert.strictEqual(ok.body.data.routes[0].approx, true);
  assert.deepStrictEqual(ok.body.data.routes[0].stations.map((s) => s.id), ['a']); // 'b' lies past the drop point
  assert.strictEqual((await request(app).get(`/api/v1/fuel/route?toCityId=${SID}`).set('Cookie', cookie)).status, 422);
  const missing = '22222222-2222-4222-8222-222222222222';
  assert.strictEqual((await request(app).get(`/api/v1/fuel/route?fromCityId=${missing}&toCityId=${SID}`).set('Cookie', cookie)).status, 404);
});

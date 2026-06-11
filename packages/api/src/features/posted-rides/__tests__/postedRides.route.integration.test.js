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

const UUID = (n) => `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}`;
const FUTURE = new Date(Date.now() + 3_600_000);

/** In-memory prisma covering the posted-rides + cities + user/sub access paths. */
function fakePrisma(seed = {}) {
  const posts = new Map((seed.posts || []).map((p) => [p.id, p]));
  const contacts = new Map();
  function project(row, select) { if (!select) return row; const o = {}; for (const k of Object.keys(select)) o[k] = row[k] ?? null; return o; }
  return {
    _posts: posts, _contacts: contacts,
    user: { async findUnique({ where }) { return (seed.users || {})[where.id] || null; } },
    city: {
      async findMany({ where }) {
        // Step-20 parse vocab query (where.isActive, no id filter): return city
        // names (each with no aliases) so extractCities has a vocabulary.
        if (!where.id) return (seed.vocab || []).map((name) => ({ canonicalName: name, aliases: [] }));
        return (seed.cities || []).filter((c) => where.id.in.includes(c.id));
      },
      // CityResolver exact-match layer — null keeps the fragment unresolved (raw fallback).
      async findFirst() { return null; },
    },
    // CityResolver exact-alias layer + unresolved-queue upsert (Step-20 parse path).
    cityAlias: { async findFirst() { return null; } },
    unresolvedCityString: { async upsert() { return {}; } },
    subscription: { async findUnique({ where }) { return (seed.subs || {})[where.userId] || null; } },
    async $queryRaw() { return seed.cityRows || []; },
    postedRide: {
      async create({ data, select }) { const row = { id: 'newpost', isClosed: false, status: 'active', createdAt: new Date(), ...data }; posts.set(row.id, row); return project(row, select); },
      async findMany({ where, take, select }) {
        let rows = [...posts.values()];
        if (where.postedBy) rows = rows.filter((p) => p.postedBy === where.postedBy);
        if (where.status && where.status.not) rows = rows.filter((p) => p.status !== where.status.not);
        else if (where.status) rows = rows.filter((p) => p.status === where.status);
        if (where.expiresAt) rows = rows.filter((p) => p.expiresAt > where.expiresAt.gt);
        rows.sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));
        return rows.slice(0, take).map((r) => project(r, select));
      },
      async findFirst({ where }) {
        const p = [...posts.values()].find((x) => x.id === where.id && x.status === where.status && x.expiresAt > where.expiresAt.gt);
        return p ? { id: p.id, phone: p.phone, postedBy: p.postedBy } : null;
      },
      async updateMany({ where, data }) {
        let n = 0;
        for (const p of posts.values()) {
          const ownOk = p.id === where.id && p.postedBy === where.postedBy;
          const statusOk = where.status && where.status.not ? p.status !== where.status.not : p.status === where.status;
          if (ownOk && statusOk) { Object.assign(p, data); n += 1; }
        }
        return { count: n };
      },
    },
    rideContact: {
      async upsert({ where }) { const k = `${where.userId_postedRideId.userId}|${where.userId_postedRideId.postedRideId}`; if (!contacts.has(k)) contacts.set(k, { contactedAt: new Date('2026-06-02T00:00:00.000Z') }); return { contactedAt: contacts.get(k).contactedAt }; },
    },
  };
}

function fakeRedis() {
  const store = new Map();
  return {
    async eval(_s, _n, k) { const c = (store.get(k) || 0) + 1; store.set(k, c); return c; },
    async get() { return null; },
    async set() { return 'OK'; },
    async del() { return 1; },
  };
}

function makeApp(seed) {
  return buildApp({
    prisma: fakePrisma(seed), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    razorpay: { async createOrder() { return { id: 'order_x' }; } },
    surepass: { async generateAadhaarOtp() { return { clientId: 'c' }; }, async submitAadhaarOtp() { return { success: true }; }, async verifyDl() { return { success: true }; }, async verifyRc() { return { success: true }; } },
  });
}

const VERIFIED = { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false };
const UNVERIFIED = { aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false };
const ACTIVE_SUB = { status: 'active', expiresAt: FUTURE, trialExpiresAt: null };

test('POST /posted-rides → 403 VERIFICATION_REQUIRED when no KYC doc', async () => {
  const app = makeApp({ users: { u1: UNVERIFIED } });
  const res = await request(app).post('/api/v1/posted-rides').set('Cookie', cookieFor('u1')).send({ fromCityRaw: 'a', toCityRaw: 'b', phone: '+919876543210' });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'VERIFICATION_REQUIRED');
});

test('POST /posted-rides → 201 + masked body (no phone) for a verified user', async () => {
  const app = makeApp({ users: { u1: VERIFIED } });
  const res = await request(app).post('/api/v1/posted-rides').set('Cookie', cookieFor('u1')).send({ fromCityRaw: 'Mohali', toCityRaw: 'Manali', phone: '+919876543210', vehicleType: 'Innova' });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal('phone' in res.body.data, false);
  assert.equal(res.body.data.vehicleType, 'Innova');
});

test('GET /posted-rides → masked feed of active posts', async () => {
  const app = makeApp({ posts: [{ id: UUID(1), postedBy: 'u9', status: 'active', expiresAt: FUTURE, createdAt: new Date(), phone: '+919999999999', fromCityRaw: 'A', toCityRaw: 'B' }] });
  const res = await request(app).get('/api/v1/posted-rides').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.posts.length, 1);
  assert.equal('phone' in res.body.data.posts[0], false);
});

test('POST /:id/contact → 200 reveals phone for a subscribed contacter', async () => {
  const app = makeApp({ posts: [{ id: UUID(2), postedBy: 'u9', status: 'active', expiresAt: FUTURE, createdAt: new Date(), phone: '+919876500000' }], subs: { u1: ACTIVE_SUB } });
  const res = await request(app).post(`/api/v1/posted-rides/${UUID(2)}/contact`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.phoneNumber, '+919876500000');
});

test('POST /:id/contact → 403 SUBSCRIPTION_EXPIRED without a subscription', async () => {
  const app = makeApp({ posts: [{ id: UUID(3), postedBy: 'u9', status: 'active', expiresAt: FUTURE, createdAt: new Date(), phone: '+91x' }] });
  const res = await request(app).post(`/api/v1/posted-rides/${UUID(3)}/contact`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'SUBSCRIPTION_EXPIRED');
});

test('DELETE /:id by a non-owner → 404', async () => {
  const app = makeApp({ posts: [{ id: UUID(4), postedBy: 'owner', status: 'active', expiresAt: FUTURE, createdAt: new Date(), phone: '+91x' }] });
  const res = await request(app).delete(`/api/v1/posted-rides/${UUID(4)}`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 404);
});

test('GET /cities → typeahead returns the (stubbed) ranked list', async () => {
  const app = makeApp({ cityRows: [{ city_id: 'c1', canonical_name: 'Ambala' }] });
  const res = await request(app).get('/api/v1/cities?q=amb').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.cities, [{ id: 'c1', canonicalName: 'Ambala' }]);
});

test('GET /cities?q=a → 422 (below min length)', async () => {
  const app = makeApp({});
  const res = await request(app).get('/api/v1/cities?q=a').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 422);
});

test('unauthenticated → 401 on the feed', async () => {
  const app = makeApp({});
  const res = await request(app).get('/api/v1/posted-rides');
  assert.equal(res.status, 401);
});

test('POST /posted-rides/parse → 401 when unauthenticated', async () => {
  const app = makeApp({});
  const res = await request(app).post('/api/v1/posted-rides/parse').send({ text: 'Delhi to Chandigarh 9876543210' });
  assert.equal(res.status, 401);
});

test('POST /posted-rides/parse → 422 on empty text (NOT verification-gated)', async () => {
  const app = makeApp({});
  const res = await request(app).post('/api/v1/posted-rides/parse').set('Cookie', cookieFor('u1')).send({ text: '' });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /posted-rides/parse → 200 draft (route fragments + phone, no gate)', async () => {
  const app = makeApp({ vocab: ['Delhi', 'Chandigarh'] });
  const res = await request(app).post('/api/v1/posted-rides/parse').set('Cookie', cookieFor('u1')).send({ text: 'Innova chahiye Delhi to Chandigarh call 9876543210' });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.phone, '+919876543210');
  assert.equal(res.body.data.vehicleType, 'Innova');
  // Resolver finds no exact/fuzzy match in the fake DB → raw fragment preserved.
  assert.equal(res.body.data.fromCityRaw, 'Delhi');
  assert.equal(res.body.data.toCityRaw, 'Chandigarh');
});

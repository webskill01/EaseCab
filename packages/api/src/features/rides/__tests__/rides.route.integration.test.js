'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { EventEmitter } = require('node:events');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES, RIDES_NEW_CHANNEL } = require('@easecab/shared');
const { buildApp } = require('../../../app');
const { createJwt } = require('../../../lib/jwt');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
};
const jwt = createJwt(CONFIG.jwt);
const USER_ID = 'u1';
const authCookie = `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: USER_ID, role: 'user' })}`;

const FUTURE = new Date(Date.now() + 3_600_000);
const PAST = new Date(Date.now() - 3_600_000);

// Ride.id is @db.Uuid and the route validates it with z.string().uuid(), so test
// ids must be real UUIDs (a non-uuid 422s before reaching the service/gate).
const R0 = '11111111-1111-4111-8111-111111111111';
const R1 = '22222222-2222-4222-8222-222222222222';
const R2 = '33333333-3333-4333-8333-333333333333';
const R_HIDDEN = '44444444-4444-4444-8444-444444444444';
const R_EXPIRED = '55555555-5555-4555-8555-555555555555';
const R_MISSING = '66666666-6666-4666-8666-666666666666';

function makeRide(id, over = {}) {
  return {
    id,
    displayText: `ride ${id} ████`,
    pickupCityId: 'c1', dropCityId: 'c2', pickupRaw: 'a', dropRaw: 'b', vehicleType: 'sedan',
    phoneNumber: '+919876543210', rawText: `secret ${id} +919876543210`,
    status: 'fresh', receivedAt: new Date(Date.now() - 1000), expiresAt: FUTURE,
    ...over,
  };
}

/** Fake prisma that actually filters/orders/limits so pagination + visibility are real. */
function fakePrisma({ rides = [], subs = {} } = {}) {
  const contacts = new Map();
  return {
    _contacts: contacts,
    ride: {
      async findMany({ where, take }) {
        let rows = rides.filter((r) => where.status.in.includes(r.status) && r.expiresAt > where.expiresAt.gt);
        if (where.OR) {
          const cur = { receivedAt: where.OR[0].receivedAt.lt, id: where.OR[1].id.lt };
          rows = rows.filter(
            (r) => r.receivedAt < cur.receivedAt || (r.receivedAt.getTime() === cur.receivedAt.getTime() && r.id < cur.id),
          );
        }
        rows.sort((a, b) => b.receivedAt - a.receivedAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
        return rows.slice(0, take);
      },
      async findUnique({ where }) {
        return rides.find((r) => r.id === where.id) || null;
      },
    },
    subscription: {
      async findUnique({ where }) { return subs[where.userId] || null; },
    },
    rideContact: {
      async upsert({ where }) {
        const key = `${where.userId_rideId.userId}|${where.userId_rideId.rideId}`;
        if (!contacts.has(key)) contacts.set(key, { contactedAt: new Date('2026-06-01T00:00:00.000Z') });
        return { contactedAt: contacts.get(key).contactedAt };
      },
    },
  };
}

/** Minimal Redis double for the contact rate-limit counter. */
function fakeRedis() {
  const store = new Map();
  return {
    async incr(k) { const c = (store.get(k)?.value || 0) + 1; store.set(k, { value: c, ttl: -1 }); return c; },
    async expire(k, s) { if (store.has(k)) store.get(k).ttl = s; return 1; },
  };
}

function makeApp(seed = {}, subscriber) {
  const sub = subscriber || { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
  const prisma = fakePrisma(seed);
  const app = buildApp({ prisma, redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG, identity: {}, subscriber: sub });
  return { app, prisma };
}

const get = (app, path, cookie = authCookie) => request(app).get(path).set('Cookie', cookie);

// ---- list -----------------------------------------------------------------

test('GET /api/v1/rides without a cookie → 401 AUTH_REQUIRED in the envelope', async () => {
  const { app } = makeApp();
  const res = await request(app).get('/api/v1/rides');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'AUTH_REQUIRED');
});

test('GET /api/v1/rides (authed) → 200 masked feed, never exposing phoneNumber/rawText', async () => {
  const { app } = makeApp({ rides: [makeRide(R0)] });
  const res = await get(app, '/api/v1/rides');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.rides));
  assert.strictEqual('nextCursor' in res.body.meta, true);
  const ride = res.body.data.rides[0];
  assert.strictEqual('phoneNumber' in ride, false);
  assert.strictEqual('rawText' in ride, false);
  assert.strictEqual(ride.displayText, `ride ${R0} ████`);
});

test('feed paginates by cursor: limit page + nextCursor, then a final page with null cursor', async () => {
  const rides = [
    makeRide(R0, { receivedAt: new Date(Date.now() - 1000) }),
    makeRide(R1, { receivedAt: new Date(Date.now() - 2000) }),
    makeRide(R2, { receivedAt: new Date(Date.now() - 3000) }),
  ];
  const { app } = makeApp({ rides });

  const p1 = await get(app, '/api/v1/rides?limit=2');
  assert.deepStrictEqual(p1.body.data.rides.map((r) => r.id), [R0, R1]);
  assert.ok(p1.body.meta.nextCursor);

  const p2 = await get(app, `/api/v1/rides?limit=2&cursor=${encodeURIComponent(p1.body.meta.nextCursor)}`);
  assert.deepStrictEqual(p2.body.data.rides.map((r) => r.id), [R2]);
  assert.strictEqual(p2.body.meta.nextCursor, null);
});

test('feed excludes hidden and expired rides', async () => {
  const rides = [
    makeRide(R0),
    makeRide(R_HIDDEN, { status: 'hidden' }),
    makeRide(R_EXPIRED, { expiresAt: PAST }),
  ];
  const { app } = makeApp({ rides });
  const res = await get(app, '/api/v1/rides');
  assert.deepStrictEqual(res.body.data.rides.map((r) => r.id), [R0]);
});

test('a tampered cursor → 422 VALIDATION_ERROR', async () => {
  const { app } = makeApp({ rides: [makeRide(R0)] });
  const res = await get(app, '/api/v1/rides?cursor=not-a-real-cursor');
  assert.strictEqual(res.status, 422);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
});

// ---- contact (soft gate) --------------------------------------------------

test('POST /:id/contact with an active trial → 200 reveals the phone (idempotent on re-tap)', async () => {
  const seed = { rides: [makeRide(R0)], subs: { [USER_ID]: { status: 'trial', trialExpiresAt: FUTURE, expiresAt: null } } };
  const { app } = makeApp(seed);
  const res = await request(app).post(`/api/v1/rides/${R0}/contact`).set('Cookie', authCookie).send();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.phoneNumber, '+919876543210');
  assert.ok(res.body.data.contactedAt);

  const again = await request(app).post(`/api/v1/rides/${R0}/contact`).set('Cookie', authCookie).send();
  assert.strictEqual(again.status, 200); // upsert → no duplicate-key 500
  assert.strictEqual(again.body.data.phoneNumber, '+919876543210');
});

test('POST /:id/contact with an expired subscription → 403 SUBSCRIPTION_EXPIRED', async () => {
  const seed = { rides: [makeRide(R0)], subs: { [USER_ID]: { status: 'expired', expiresAt: PAST } } };
  const { app } = makeApp(seed);
  const res = await request(app).post(`/api/v1/rides/${R0}/contact`).set('Cookie', authCookie).send();
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error.code, 'SUBSCRIPTION_EXPIRED');
});

test('POST /:id/contact for an unknown ride → 404; a non-uuid id → 422', async () => {
  const seed = { rides: [], subs: { [USER_ID]: { status: 'trial', trialExpiresAt: FUTURE } } };
  const { app } = makeApp(seed);

  const missing = await request(app)
    .post(`/api/v1/rides/${R_MISSING}/contact`)
    .set('Cookie', authCookie).send();
  assert.strictEqual(missing.status, 404);
  assert.strictEqual(missing.body.error.code, 'NOT_FOUND');

  const bad = await request(app).post('/api/v1/rides/not-a-uuid/contact').set('Cookie', authCookie).send();
  assert.strictEqual(bad.status, 422);
  assert.strictEqual(bad.body.error.code, 'VALIDATION_ERROR');
});

test('contact reveals are rate-limited per user → 429 RATE_LIMITED past the cap', async () => {
  const { CONTACT_RATE_LIMIT } = require('@easecab/shared');
  const seed = { rides: [makeRide(R0)], subs: { [USER_ID]: { status: 'trial', trialExpiresAt: FUTURE } } };
  const { app } = makeApp(seed);
  // Burn the budget (same ride re-tap counts — it's still a reveal).
  for (let i = 0; i < CONTACT_RATE_LIMIT.MAX_PER_WINDOW; i += 1) {
    const ok = await request(app).post(`/api/v1/rides/${R0}/contact`).set('Cookie', authCookie).send();
    assert.strictEqual(ok.status, 200);
  }
  const over = await request(app).post(`/api/v1/rides/${R0}/contact`).set('Cookie', authCookie).send();
  assert.strictEqual(over.status, 429);
  assert.strictEqual(over.body.error.code, 'RATE_LIMITED');
});

// ---- SSE ------------------------------------------------------------------

test('GET /api/v1/rides/stream pushes a masked ride on a publish, then cleans up', { timeout: 8000 }, async () => {
  // A real EventEmitter subscriber so we can inject a publish.
  const subscriber = new EventEmitter();
  subscriber.subscribe = async () => {};
  subscriber.unsubscribe = async () => {};
  const { app } = makeApp({ rides: [makeRide(R0)] }, subscriber);

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();

  try {
    const rideEvent = await new Promise((resolve, reject) => {
      const req = http.get(
        { port, path: '/api/v1/rides/stream', headers: { Cookie: authCookie, Accept: 'text/event-stream' } },
        (res) => {
          assert.match(res.headers['content-type'], /text\/event-stream/);
          assert.strictEqual(res.headers['x-accel-buffering'], 'no');
          let buf = '';
          res.on('data', (chunk) => {
            buf += chunk.toString();
            if (buf.includes('event: ride')) {
              const dataLine = buf.split('\n').find((l) => l.startsWith('data: '));
              req.destroy();
              resolve(JSON.parse(dataLine.slice('data: '.length)));
            }
          });
          // Once the stream is open, inject a publish notification.
          subscriber.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: R0 }));
        },
      );
      req.on('error', (e) => { if (e.code !== 'ECONNRESET') reject(e); });
    });

    assert.strictEqual(rideEvent.id, R0);
    assert.strictEqual('phoneNumber' in rideEvent, false); // masked over the wire
    assert.strictEqual(rideEvent.displayText, `ride ${R0} ████`);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

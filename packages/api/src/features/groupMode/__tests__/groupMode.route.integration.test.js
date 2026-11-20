'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
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
const cookieFor = (sub) => `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub, role: 'user' })}`;
const DEL = '3b9cf26d-73e3-4477-bcde-747eda87dfe4';
const PAID = { status: 'active', expiresAt: new Date(Date.now() + 86_400_000) };

function makeApp() {
  const users = new Map();
  const ride = { id: 'r1', displayText: 'Delhi ████', rawText: 'Delhi 9876543210', phoneNumber: '+919876543210', status: 'fresh', receivedAt: new Date(), expiresAt: new Date(Date.now() + 3_600_000) };
  const prisma = {
    user: {
      async findUnique({ where }) { return { groupMode: users.get(where.id) ?? null }; },
      async update({ where, data }) { users.set(where.id, data.groupMode); return { id: where.id }; },
    },
    city: { async findMany() { return [{ id: DEL, canonicalName: 'Delhi', namePa: null, nameHi: null }]; } },
    subscription: { async findUnique({ where }) { return where.userId === 'paid' ? PAID : null; } },
    ride: { async findMany() { return [ride]; }, async count() { return 1; }, async findFirst() { return ride; } },
    postedRide: { async findMany() { return []; } },
    async $queryRaw() { return []; },
  };
  const redis = { async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; } };
  const subscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
  return buildApp({ prisma, redis, logger: pino({ level: 'silent' }), config: CONFIG, identity: {}, subscriber, cashfree: {}, surepass: {} });
}

test('group mode: auth required, paywall on open feeds, settings round-trip', async () => {
  const app = makeApp();
  assert.equal((await request(app).get('/api/v1/group-mode/settings')).status, 401);

  const free = await request(app).get('/api/v1/group-mode/rides').set('Cookie', cookieFor('free'));
  assert.equal(free.status, 403);
  assert.equal(free.body.error.code, 'SUBSCRIPTION_EXPIRED');
  const freeOn = await request(app).put('/api/v1/group-mode/settings').set('Cookie', cookieFor('free')).send({ enabled: true, cityIds: [DEL] });
  assert.equal(freeOn.status, 403);

  const def = await request(app).get('/api/v1/group-mode/settings').set('Cookie', cookieFor('paid'));
  assert.equal(def.body.data.enabled, false);
  const on = await request(app).put('/api/v1/group-mode/settings').set('Cookie', cookieFor('paid')).send({ enabled: true, cityIds: [DEL] });
  assert.equal(on.status, 200);
  assert.deepEqual(on.body.data, { enabled: true, groups: [{ cityId: DEL, name: 'Delhi', namePa: null, nameHi: null }], pinned: ['all'] });

  const rides = await request(app).get(`/api/v1/group-mode/rides?cityIds=${DEL}`).set('Cookie', cookieFor('paid'));
  assert.equal(rides.body.data.rides[0].phoneNumber, '+919876543210');
  assert.equal(rides.body.data.rides[0].text, 'Delhi 9876543210');
});

test('group mode summary: validates the g param', async () => {
  const app = makeApp();
  const bad = await request(app).get('/api/v1/group-mode/summary?g=nope.1').set('Cookie', cookieFor('paid'));
  assert.equal(bad.status, 422);
  const ok = await request(app).get(`/api/v1/group-mode/summary?g=${DEL}.0,all.0,duties.0`).set('Cookie', cookieFor('paid'));
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.data.groups.map((g) => g.key), [DEL, 'all', 'duties']);
});

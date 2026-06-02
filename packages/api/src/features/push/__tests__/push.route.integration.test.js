'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES, RIDES_NEW_CHANNEL, POSTED_RIDES_NEW_CHANNEL } = require('@easecab/shared');
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
const CITY = UUID(7);

const project = (row, select) => { if (!select) return row; const o = {}; for (const k of Object.keys(select)) o[k] = row[k] ?? null; return o; };

function fakePrisma(seed = {}) {
  const users = new Map((seed.users || []).map((u) => [u.id, u]));
  const subs = [...(seed.subs || [])];
  const cities = new Map((seed.cities || []).map((c) => [c.id, { isActive: true, ...c }]));
  let seq = 0;
  return {
    _subs: subs,
    pushSubscription: {
      async upsert({ where, create, update, select }) {
        const { userId, deviceToken } = where.userId_deviceToken;
        let s = subs.find((x) => x.userId === userId && x.deviceToken === deviceToken);
        if (s) Object.assign(s, update);
        else { s = { id: `ps${seq += 1}`, createdAt: new Date(), ...create }; subs.push(s); }
        return project(s, select);
      },
      async deleteMany({ where }) {
        const before = subs.length;
        for (let i = subs.length - 1; i >= 0; i -= 1) {
          const s = subs[i];
          const tokenMatch = where.deviceToken && where.deviceToken.in ? where.deviceToken.in.includes(s.deviceToken) : s.deviceToken === where.deviceToken;
          if (tokenMatch && (where.userId ? s.userId === where.userId : true)) subs.splice(i, 1);
        }
        return { count: before - subs.length };
      },
      async findMany({ where, distinct }) {
        const u = where.user;
        const toggleKey = Object.keys(u).find((k) => k.startsWith('notify'));
        let rows = subs.filter((s) => {
          const o = users.get(s.userId);
          return o && o.isDeleted === u.isDeleted && o[toggleKey] === u[toggleKey]
            && (o.notificationCities || []).some((c) => u.notificationCities.hasSome.includes(c));
        });
        if (distinct) { const seen = new Set(); rows = rows.filter((r) => (seen.has(r.deviceToken) ? false : seen.add(r.deviceToken))); }
        return rows.map((r) => ({ deviceToken: r.deviceToken }));
      },
    },
    city: { async findMany({ where }) { return [...cities.values()].filter((c) => where.id.in.includes(c.id) && c.isActive === where.isActive).map((c) => ({ id: c.id })); } },
    user: {
      async findUnique({ where, select }) { const u = users.get(where.id); return u ? project(u, select) : null; },
      async update({ where, data, select }) { const u = users.get(where.id); Object.assign(u, data); return project(u, select); },
    },
  };
}

function fakeRedis() { return { async eval() { return 1; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; }, async publish() { return 1; } }; }
function sseSub() { return { on() {}, subscribe: async () => {}, removeListener() {}, unsubscribe: async () => {}, duplicate() { return this; }, disconnect() {} }; }

function makeApp(seed) {
  const pushSubscriber = new EventEmitter();
  pushSubscriber.subscribe = async () => {};
  pushSubscriber.unsubscribe = async () => {};
  const pushSender = { calls: [], async sendToTokens(a) { this.calls.push(a); return { successCount: a.tokens.length, staleTokens: [] }; } };
  const app = buildApp({
    prisma: fakePrisma(seed), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: sseSub(),
    razorpay: { async createOrder() { return { id: 'order_x' }; } },
    surepass: {},
    pushSender, pushSubscriber,
  });
  app.locals._pushSender = pushSender;
  app.locals._pushSubscriber = pushSubscriber;
  return app;
}

const userSeed = (id, over = {}) => ({ id, isDeleted: false, notificationCities: [], notifyBotRides: true, notifyPostedRides: true, ...over });

test('POST /push/subscriptions → 201 registers a token (raw token not echoed)', async () => {
  const app = makeApp({});
  const res = await request(app).post('/api/v1/push/subscriptions').set('Cookie', cookieFor('u1')).send({ deviceToken: 'tok-123', platform: 'android' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.platform, 'android');
  assert.equal('deviceToken' in res.body.data, false);
});

test('POST /push/subscriptions → 422 on a bad platform', async () => {
  const res = await request(makeApp({})).post('/api/v1/push/subscriptions').set('Cookie', cookieFor('u1')).send({ deviceToken: 'tok', platform: 'symbian' });
  assert.equal(res.status, 422);
});

test('DELETE /push/subscriptions → 200 reports removed count', async () => {
  const app = makeApp({ subs: [{ id: 'p1', userId: 'u1', deviceToken: 'tok', platform: 'web' }] });
  const res = await request(app).delete('/api/v1/push/subscriptions').set('Cookie', cookieFor('u1')).send({ deviceToken: 'tok' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.removed, 1);
});

test('GET /push/preferences → 200 returns the prefs', async () => {
  const app = makeApp({ users: [userSeed('u1', { notificationCities: [CITY], notifyBotRides: false })] });
  const res = await request(app).get('/api/v1/push/preferences').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.notificationCities, [CITY]);
  assert.equal(res.body.data.notifyBotRides, false);
});

test('PATCH /push/preferences → 200 updates toggles; 422 on unknown city / empty body', async () => {
  const app = makeApp({ users: [userSeed('u1')], cities: [{ id: CITY }] });
  const ok = await request(app).patch('/api/v1/push/preferences').set('Cookie', cookieFor('u1')).send({ notificationCities: [CITY], notifyPostedRides: false });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.data.notificationCities, [CITY]);

  const badCity = await request(app).patch('/api/v1/push/preferences').set('Cookie', cookieFor('u1')).send({ notificationCities: [UUID(9)] });
  assert.equal(badCity.status, 422);
  assert.equal(badCity.body.error.code, 'VALIDATION_ERROR');

  const empty = await request(app).patch('/api/v1/push/preferences').set('Cookie', cookieFor('u1')).send({});
  assert.equal(empty.status, 422);
});

test('unauthenticated → 401 on the push routes', async () => {
  const res = await request(makeApp({})).get('/api/v1/push/preferences');
  assert.equal(res.status, 401);
});

test('LIVE dispatch: a bot-ride event pushes to opted-in users\' tokens', async () => {
  const app = makeApp({
    users: [userSeed('u1', { notificationCities: [CITY] })],
    subs: [{ id: 'p1', userId: 'u1', deviceToken: 'tok-live', platform: 'android' }],
  });
  app.locals._pushSubscriber.emit('message', RIDES_NEW_CHANNEL, JSON.stringify({ id: 'r1', pickupCityId: CITY, dropCityId: null, status: 'fresh' }));
  await new Promise((r) => setImmediate(r));
  const sent = app.locals._pushSender.calls;
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].tokens, ['tok-live']);
  assert.equal(sent[0].data.source, 'bot');
  assert.equal(sent[0].notification.title, 'New ride in your city');
});

test('LIVE dispatch: a posted-ride event uses the posted toggle + copy', async () => {
  const app = makeApp({
    users: [userSeed('u1', { notificationCities: [CITY], notifyBotRides: false })], // bot off, posted on
    subs: [{ id: 'p1', userId: 'u1', deviceToken: 'tok-live', platform: 'web' }],
  });
  app.locals._pushSubscriber.emit('message', POSTED_RIDES_NEW_CHANNEL, JSON.stringify({ id: 'p9', fromCityId: CITY, toCityId: null }));
  await new Promise((r) => setImmediate(r));
  const sent = app.locals._pushSender.calls;
  assert.equal(sent.length, 1);
  assert.equal(sent[0].data.source, 'posted');
  assert.equal(sent[0].notification.title, 'New verified ride in your city');
});

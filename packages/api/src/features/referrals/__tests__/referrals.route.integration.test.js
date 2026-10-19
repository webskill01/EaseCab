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
  referrals: { all: true, phones: [] },
};
const jwt = createJwt(CONFIG.jwt);
const cookieFor = (id) => `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: id, role: 'user' })}`;

function makeApp() {
  const updates = [];
  const prisma = {
    user: {
      async findUnique({ where }) {
        return { id: where.id, phone: '+919000000001', createdAt: new Date(), referredById: null, referredBy: null };
      },
      async findFirst() { return { id: 'ref', name: 'SUNIL' }; },
      async updateMany(args) { updates.push(args); return { count: 1 }; },
      async findMany() { return []; },
    },
    async $transaction(ops) { return Promise.all(ops); },
  };
  const app = buildApp({
    prisma, redis: { async eval() { return 1; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; } },
    logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    cashfree: {}, surepass: {},
  });
  app.locals._updates = updates;
  return app;
}

test('POST /referrals/claim → 200 sets the referrer from a loosely typed number', async () => {
  const app = makeApp();
  const res = await request(app).post('/api/v1/referrals/claim').set('Cookie', cookieFor('u1')).send({ phone: '98776 69671' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.referrer.name, 'SUNIL');
  assert.deepEqual(app.locals._updates[0], { where: { id: 'u1', referredById: null }, data: { referredById: 'ref' } });
});

test('POST /referrals/claim → 422 on a bad number', async () => {
  const res = await request(makeApp()).post('/api/v1/referrals/claim').set('Cookie', cookieFor('u1')).send({ phone: '12345' });
  assert.equal(res.status, 422);
});

test('GET /referrals → overview shape', async () => {
  const res = await request(makeApp()).get('/api/v1/referrals').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.referrals, []);
  assert.equal(res.body.data.canClaim, true);
  assert.equal(res.body.data.perReward, 2);
});

test('GET /referrals → 401 without auth', async () => {
  assert.equal((await request(makeApp()).get('/api/v1/referrals')).status, 401);
});

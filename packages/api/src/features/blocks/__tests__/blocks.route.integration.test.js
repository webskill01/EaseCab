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

function makeApp() {
  const created = [];
  const deleted = [];
  const prisma = { userBlock: {
    async upsert({ create }) { created.push(create); return { id: 'b1', createdAt: new Date() }; },
    async findMany({ where }) {
      return [{ id: 'b1', blockedId: UUID(2), createdAt: new Date('2026-06-21T00:00:00Z'),
        blocked: { name: 'Raj', profilePicUrl: 'r2/x', baseCity: 'Ludhiana' }, _where: where }];
    },
    async deleteMany({ where }) { deleted.push(where); return { count: 1 }; },
  } };
  const app = buildApp({
    prisma, redis: { async eval() { return 1; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; } },
    logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    razorpay: {}, surepass: {},
  });
  app.locals._created = created;
  app.locals._deleted = deleted;
  return app;
}

test('POST /blocks → 201 records the block for the authed caller', async () => {
  const app = makeApp();
  const res = await request(app).post('/api/v1/blocks').set('Cookie', cookieFor('u1')).send({ blockedId: UUID(2) });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.blockedId, UUID(2));
  assert.deepEqual(app.locals._created[0], { blockerId: 'u1', blockedId: UUID(2) });
});

test('POST /blocks → 422 on a non-uuid blockedId', async () => {
  const res = await request(makeApp()).post('/api/v1/blocks').set('Cookie', cookieFor('u1')).send({ blockedId: 'nope' });
  assert.equal(res.status, 422);
});

test('POST /blocks → 401 without auth', async () => {
  const res = await request(makeApp()).post('/api/v1/blocks').send({ blockedId: UUID(2) });
  assert.equal(res.status, 401);
});

test('GET /blocks → 200 lists the caller\'s blocks scoped to their id', async () => {
  const app = makeApp();
  const res = await request(app).get('/api/v1/blocks').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.blocks.length, 1);
  assert.equal(res.body.data.blocks[0].name, 'Raj');
  assert.equal(res.body.data.blocks[0].blockedId, UUID(2));
});

test('GET /blocks → 401 without auth', async () => {
  const res = await request(makeApp()).get('/api/v1/blocks');
  assert.equal(res.status, 401);
});

test('DELETE /blocks/:blockedId → 200 unblocks for the authed caller', async () => {
  const app = makeApp();
  const res = await request(app).delete(`/api/v1/blocks/${UUID(2)}`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.blockedId, UUID(2));
  assert.deepEqual(app.locals._deleted[0], { blockerId: 'u1', blockedId: UUID(2) });
});

test('DELETE /blocks/:blockedId → 422 on a non-uuid id', async () => {
  const res = await request(makeApp()).delete('/api/v1/blocks/nope').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 422);
});

test('DELETE /blocks/:blockedId → 401 without auth', async () => {
  const res = await request(makeApp()).delete(`/api/v1/blocks/${UUID(2)}`);
  assert.equal(res.status, 401);
});

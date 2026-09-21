'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const TOKEN = 't'.repeat(40);

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  fleet: { syncToken: TOKEN, peers: [] },
  cashfree: { secretKey: 'x'.repeat(16) },
};

const published = [];

function fakeRedis() {
  const m = new Map();
  return {
    async ttl() { return -2; },
    async eval(_s, _n, k) { const c = (m.get(k) || 0) + 1; m.set(k, c); return c; },
    async set() { return 'OK'; }, async get() { return null; }, async del() { return 0; },
    async publish(ch, msg) { published.push([ch, msg]); return 1; },
  };
}

const rows = [];
let removedIds = [];

function fakePrisma() {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    adminUser: { async findUnique() { return null; }, async findFirst() { return null; } },
    botFilterEntry: {
      async findMany({ where }) { return rows.filter((r) => where.list.in.includes(r.list)); },
      async createMany({ data }) {
        const fresh = data.filter((d) => !rows.some((r) => r.list === d.list && r.value === d.value));
        rows.push(...fresh.map((d, i) => ({ id: `id-${rows.length + i}`, ...d })));
        return { count: fresh.length };
      },
      async findFirst({ where }) {
        const want = where.value.equals.toLowerCase();
        return rows.find((r) => r.list === where.list && r.value.toLowerCase() === want) || null;
      },
      async count({ where }) { return rows.filter((r) => r.list === where.list).length; },
      async delete({ where }) { removedIds.push(where.id); const i = rows.findIndex((r) => r.id === where.id); rows.splice(i, 1); },
    },
  };
}

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const surepass = { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } };

const prisma = fakePrisma();
function app(config = CONFIG) {
  return buildApp({
    prisma, redis: fakeRedis(), logger: pino({ level: 'silent' }), config,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, cashfree: { async createOrder() { return { id: 'o' }; } }, surepass,
  });
}
const call = (method, path) => request(app())[method](`/api/v1/fleet${path}`).set('x-token', TOKEN);

test('rejects a missing or wrong token in the fleet error shape', async () => {
  const res = await request(app()).get('/api/v1/fleet/api/block/list').set('x-token', 'wrong');
  assert.strictEqual(res.status, 401);
  assert.deepStrictEqual(res.body, { error: 'Invalid or missing token' });
});

test('an IP over the failed-token limit gets 429 even with the right token', async () => {
  const blocked = { ...fakeRedis(), async get() { return '20'; } };
  const res = await request(buildApp({
    prisma, redis: blocked, logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({}), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, cashfree: { async createOrder() { return { id: 'o' }; } }, surepass,
  })).get('/api/v1/fleet/api/bots').set('x-token', TOKEN);
  assert.strictEqual(res.status, 429);
});

test('is not mounted without FLEET_SYNC_TOKEN', async () => {
  const res = await request(app({ ...CONFIG, fleet: { peers: [] } })).get('/api/v1/fleet/api/bots').set('x-token', TOKEN);
  assert.strictEqual(res.status, 404);
});

test('GET /api/bots identifies EaseCab', async () => {
  const res = await call('get', '/api/bots');
  assert.deepStrictEqual(res.body, { bots: [{ id: 'easecab' }] });
});

test('number / sender / ignore writes land in the right lists and answer ok', async () => {
  let res = await call('post', '/api/block/number').send({ input: '+91 98765 43210, 9876543211' });
  assert.deepStrictEqual(res.body, { ok: true, added: 2, duplicates: 0 });
  res = await call('post', '/api/block/sender').send({ input: '9000000001' });
  assert.strictEqual(res.body.ok, true);
  res = await call('post', '/api/block/ignore').send({ phrase: 'Loan' });
  assert.strictEqual(res.body.ok, true);
  res = await call('post', '/api/block/ignore').send({ phrase: 'khali' });
  assert.strictEqual(res.body.ok, true);
  res = await call('post', '/api/block/ignore').send({ phrase: 'LOAN' });
  assert.deepStrictEqual(res.body, { ok: true, added: 0, duplicates: 1 });

  res = await call('get', '/api/block/list');
  assert.deepStrictEqual(res.body, {
    counts: { blockedPhoneNumbers: 2, blockedSenders: 1, ignoreIfContains: 2 },
    data: { blockedPhoneNumbers: ['9876543210', '9876543211'], blockedSenders: ['9000000001'], ignoreIfContains: ['Loan', 'khali'] },
  });
});

test('garbage number input answers ok with nothing added, like the fleet', async () => {
  const res = await call('post', '/api/block/number').send({ input: 'hello' });
  assert.deepStrictEqual(res.body, { ok: true, added: [] });
});

test('remove by field + value; last required entry → 409; bad field → 400', async () => {
  let res = await call('post', '/api/block/remove').send({ field: 'blockedPhoneNumbers', value: '9876543210' });
  assert.deepStrictEqual(res.body, { ok: true, removed: 1 });
  res = await call('post', '/api/block/remove').send({ field: 'ignoreIfContains', value: 'loan' });
  assert.deepStrictEqual(res.body, { ok: true, removed: 1 });
  res = await call('post', '/api/block/remove').send({ field: 'ignoreIfContains', value: 'khali' });
  assert.strictEqual(res.status, 409);
  res = await call('post', '/api/block/remove').send({ field: 'rideKeywords', value: 'x' });
  assert.strictEqual(res.status, 400);
});

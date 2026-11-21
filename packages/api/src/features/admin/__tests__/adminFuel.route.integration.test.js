'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

// bcrypt hash of "admin-pass-123" (generated with bcryptjs, 10 rounds).
const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  cashfree: { secretKey: 'x'.repeat(16) },
};
const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };
const SID = '11111111-1111-4111-8111-111111111111';

function fakePrisma(log) {
  return {
    async $transaction(arg) { return typeof arg === 'function' ? arg(this) : Promise.all(arg); },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    fuelStation: {
      async findMany(args) { log.findMany = args; return [{ id: SID, name: 'Sandhu CNG', status: 'pending' }]; },
      async count({ where }) { return where.status === 'pending' ? 3 : 2; },
      async updateMany(args) { log.update = args; return { count: args.where.id === SID ? 1 : 0 }; },
      async findUnique() { return { id: SID, ...log.update.data }; },
    },
    fuelStationReport: { async updateMany(args) { log.resolved = args; return { count: 1 }; } },
  };
}

function app(log = {}) {
  return buildApp({
    prisma: fakePrisma(log),
    redis: { async eval() { return 1; }, async ttl() { return -2; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 0; } },
    logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} },
    cashfree: {}, surepass: {},
  });
}

async function adminAgent(log) {
  const agent = request.agent(app(log));
  await agent.post('/api/v1/admin/auth/login').send({ email: ADMIN.email, password: 'admin-pass-123' });
  return agent;
}

test('GET /admin/fuel without a session → 401', async () => {
  assert.strictEqual((await request(app()).get('/api/v1/admin/fuel')).status, 401);
});

test('GET /admin/fuel → pending tab, both tab counts, meta', async () => {
  const log = {};
  const res = await (await adminAgent(log)).get('/api/v1/admin/fuel');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.stations[0].name, 'Sandhu CNG');
  assert.deepStrictEqual(res.body.data.counts, { pending: 3, reports: 2 });
  assert.deepStrictEqual(res.body.meta, { page: 1, limit: 50, total: 3 });
  assert.strictEqual(log.findMany.where.status, 'pending');
});

test('GET /admin/fuel?tab=reports → stations with open reports', async () => {
  const log = {};
  const res = await (await adminAgent(log)).get('/api/v1/admin/fuel?tab=reports');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(log.findMany.where, { reports: { some: { resolvedAt: null } } });
});

test('PATCH /admin/fuel/stations/:id approves + turns CNG on, closes open reports; unknown → 404; bad → 422', async () => {
  const log = {};
  const agent = await adminAgent(log);
  const res = await agent.patch(`/api/v1/admin/fuel/stations/${SID}`).send({ status: 'active', hasCng: true });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(log.update.data.status, 'active');
  assert.ok(log.update.data.cngConfirmedAt instanceof Date);
  assert.deepStrictEqual(log.resolved.where, { stationId: SID, resolvedAt: null });
  assert.strictEqual((await agent.patch('/api/v1/admin/fuel/stations/33333333-3333-4333-8333-333333333333').send({})).status, 404);
  assert.strictEqual((await agent.patch(`/api/v1/admin/fuel/stations/${SID}`).send({ status: 'gone' })).status, 422);
});

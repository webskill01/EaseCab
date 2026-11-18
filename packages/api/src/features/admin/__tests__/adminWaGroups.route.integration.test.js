'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { buildApp } = require('../../../app');

const HASH = '$2a$10$qNpq1zI26z0IYF4tkwP2JOAav42VeONDnUvoVMUQevsXKgOyhRya.';
const GROUP_ID = '22222222-2222-2222-2222-222222222222';
const LINK_ID = '33333333-3333-3333-3333-333333333333';

const CONFIG = {
  corsOrigins: ['http://localhost:3001'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  adminJwt: { accessSecret: 'c'.repeat(32), refreshSecret: 'd'.repeat(32), accessTtl: '15m', refreshTtl: '8h' },
  cashfree: { secretKey: 'x'.repeat(16) },
};

const published = [];
const updates = [];

function fakeRedis() {
  const m = new Map();
  return {
    async ttl() { return -2; },
    async eval(_s, _n, k) { const c = (m.get(k) || 0) + 1; m.set(k, c); return c; },
    async set() { return 'OK'; }, async get() { return null; }, async del() { return 0; },
    async publish(ch) { published.push(ch); return 1; },
    async smismember(_k, ...jids) { return jids.map(() => 1); },
    async smembers() { return ['120363@g.us']; },
  };
}

const ADMIN = { id: 'adm1', email: 'admin@easecab.com', name: 'Root', role: 'super', passwordHash: HASH };
const GROUP = { id: GROUP_ID, jid: '120363@g.us', name: 'PUNJAB TAXI', participants: 900, enabled: true, lastSeenAt: new Date() };

function fakePrisma() {
  return {
    async $transaction(arg) { if (typeof arg === 'function') return arg(this); return Promise.all(arg); },
    adminUser: {
      async findUnique({ where }) { return where.email === ADMIN.email ? { ...ADMIN } : null; },
      async findFirst({ where }) { return where.id === ADMIN.id ? { ...ADMIN } : null; },
    },
    waSession: { async findMany() { return [{ slot: 'slot-1', name: 'Tanishq' }]; } },
    waInviteLink: {
      async findMany() { return [{ id: LINK_ID, code: 'AbCdEfGhIjKlMnOpQrStUv', status: 'new', groupJid: null, sourceGroupJid: '120363@g.us' }]; },
      async count() { return 1; },
      async groupBy() { return [{ status: 'new', _count: { _all: 1 } }]; },
      async updateMany({ where }) { return { count: where.id === LINK_ID ? 1 : 0 }; },
      async findUnique() { return { id: LINK_ID, status: 'avoided' }; },
    },
    waGroup: {
      async findMany() { return [GROUP]; },
      async count({ where }) { return where.enabled === false ? 0 : 1; },
      async updateMany(args) {
        updates.push(args);
        return { count: args.where.id && args.where.id !== GROUP_ID ? 0 : 1 };
      },
      async findUnique() { return { ...GROUP, enabled: false, ...updates.at(-1)?.data }; },
    },
  };
}

const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const surepass = { async generateAadhaarOtp() { return {}; }, async submitAadhaarOtp() { return {}; }, async verifyDl() { return {}; }, async verifyRc() { return {}; } };

function app() {
  return buildApp({
    prisma: fakePrisma(), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+910000000000' }), mintCustomToken: async () => 'ct' },
    subscriber: inertSubscriber, cashfree: { async createOrder() { return { id: 'o' }; } }, surepass,
  });
}

async function adminAgent() {
  const agent = request.agent(app());
  await agent.post('/api/v1/admin/auth/login').send({ email: 'admin@easecab.com', password: 'admin-pass-123' });
  return agent;
}

test('GET /admin/wa-groups without a session → 401', async () => {
  assert.strictEqual((await request(app()).get('/api/v1/admin/wa-groups')).status, 401);
});

test('GET /admin/wa-groups returns groups, overall on/off counts and meta', async () => {
  const agent = await adminAgent();
  const res = await agent.get('/api/v1/admin/wa-groups?status=on&q=punjab');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.groups[0].name, 'PUNJAB TAXI');
  assert.deepStrictEqual(res.body.data.counts, { on: 1, off: 0 });
  assert.deepStrictEqual(res.body.meta, { page: 1, limit: 50, total: 1 });
});

test('GET with a bad status → 422', async () => {
  const agent = await adminAgent();
  assert.strictEqual((await agent.get('/api/v1/admin/wa-groups?status=maybe')).status, 422);
});

test('PATCH /admin/wa-groups/:id switches a group and notifies the bot; unknown → 404; non-boolean → 422', async () => {
  const agent = await adminAgent();
  published.length = 0;
  const res = await agent.patch(`/api/v1/admin/wa-groups/${GROUP_ID}`).send({ enabled: false });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.group.enabled, false);
  assert.deepStrictEqual(published, ['easecab:bot:groups:changed']);
  assert.strictEqual((await agent.patch('/api/v1/admin/wa-groups/33333333-3333-3333-3333-333333333333').send({ enabled: true })).status, 404);
  assert.strictEqual((await agent.patch(`/api/v1/admin/wa-groups/${GROUP_ID}`).send({ enabled: 'yes' })).status, 422);
  assert.strictEqual((await agent.patch(`/api/v1/admin/wa-groups/${GROUP_ID}`).send({})).status, 422);
  const dd = await agent.patch(`/api/v1/admin/wa-groups/${GROUP_ID}`).send({ directDuty: true });
  assert.strictEqual(dd.status, 200);
  assert.strictEqual(dd.body.data.group.directDuty, true);
});

test('POST /admin/wa-groups/bulk switches all groups matching the search', async () => {
  const agent = await adminAgent();
  updates.length = 0;
  const res = await agent.post('/api/v1/admin/wa-groups/bulk').send({ enabled: true, q: 'taxi' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.data, { updated: 1 });
  assert.deepStrictEqual(updates[0].data, { enabled: true });
  assert.ok(updates[0].where.OR);
});

test('GET /admin/wa-groups rows carry the sessions in each group', async () => {
  const res = await (await adminAgent()).get('/api/v1/admin/wa-groups?status=shared');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.data.groups[0].sessions, ['Tanishq']);
});

test('GET /admin/wa-invites: links with join URL, source group name and tab counts', async () => {
  assert.strictEqual((await request(app()).get('/api/v1/admin/wa-invites')).status, 401);
  const res = await (await adminAgent()).get('/api/v1/admin/wa-invites?status=new');
  assert.strictEqual(res.status, 200);
  const [link] = res.body.data.links;
  assert.strictEqual(link.url, 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv');
  assert.strictEqual(link.sourceGroupName, 'PUNJAB TAXI');
  assert.deepStrictEqual(res.body.data.counts, { new: 1, joined: 0, avoided: 0, invalid: 0 });
});

test("PATCH /admin/wa-invites/:id avoids; joined is the bot's call only; unknown id 404", async () => {
  const agent = await adminAgent();
  const ok = await agent.patch(`/api/v1/admin/wa-invites/${LINK_ID}`).send({ status: 'avoided' });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.data.link.status, 'avoided');
  assert.strictEqual((await agent.patch(`/api/v1/admin/wa-invites/${LINK_ID}`).send({ status: 'joined' })).status, 422);
  assert.strictEqual((await agent.patch(`/api/v1/admin/wa-invites/${GROUP_ID}`).send({ status: 'avoided' })).status, 404);
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES, BORDER_TAX_KEYS: K } = require('@easecab/shared');
const { buildApp } = require('../../../app');
const { createJwt } = require('../../../lib/jwt');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  cashfree: { secretKey: 'x'.repeat(16) },
};
const jwt = createJwt(CONFIG.jwt);
const cookieFor = (id) => `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: id, role: 'user' })}`;
const ID = '11111111-1111-4111-8111-111111111111';
const START = () => new Date(Date.now() + 86_400_000).toISOString();
const body = (o = {}) => ({ vehicleNo: 'pb01 e9454', stateCd: 'HR', checkpost: 'PANCHKULA', distanceKm: 50, seats: '4+1', startAt: START(), days: 1, declare: true, ...o });

/** In-memory borderTaxRequest + the Redis calls the repository makes. u1 is a member, u3 is not. */
function makeApp() {
  const rows = [];
  const strings = {};
  const subs = { u1: { status: 'active', expiresAt: new Date(Date.now() + 86_400_000) } };
  const hashes = {};
  const lists = {};
  const match = (r, where) => Object.entries(where).every(([k, v]) => (v && v.notIn ? !v.notIn.includes(r[k]) : v && v.in ? v.in.includes(r[k]) : r[k] === v));
  const prisma = { borderTaxRequest: {
    async create({ data }) { const r = { id: ID, createdAt: new Date(), ...data }; rows.push(r); return r; },
    async findFirst({ where }) { return rows.find((r) => match(r, where)) || null; },
    async findMany({ where }) { return rows.filter((r) => r.userId === where.userId); },
    async count({ where }) { return rows.filter((r) => match(r, where)).length; },
    async updateMany({ where, data }) { const r = rows.find((x) => match(x, where)); if (r) Object.assign(r, data); return { count: r ? 1 : 0 }; },
  }, subscription: { async findUnique({ where }) { return subs[where.userId] || null; } } };
  const multi = () => {
    const ops = [];
    const m = { hset: (k, f) => { ops.push(() => { hashes[k] = { ...hashes[k], ...f }; }); return m; },
      rpush: (k, v) => { ops.push(() => { (lists[k] ||= []).push(v); }); return m; }, expire: () => m,
      exec: async () => ops.forEach((f) => f()) };
    return m;
  };
  const redis = {
    async eval() { return 1; }, async get(k) { return strings[k] ?? null; }, async set(k, v) { strings[k] = v; return 'OK'; }, async del() { return 1; }, async pttl() { return -2; },
    async lpush(k, v) { (lists[k] ||= []).push(v); }, async hgetall(k) { return hashes[k] || {}; }, multi,
  };
  const app = buildApp({
    prisma, redis, logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    cashfree: {}, surepass: {},
  });
  return { app, rows, hashes, lists, strings };
}

test('POST /border-tax → 201 queues an HR filing (vehicle normalised, NOT APPLICABLE permit)', async () => {
  const t = makeApp();
  const res = await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  assert.equal(res.status, 201);
  assert.deepEqual([t.rows[0].vehicleNo, t.rows[0].permitType, t.rows[0].status, t.rows[0].userId], ['PB01E9454', '0', 'queued', 'u1']);
  assert.deepEqual(Object.values(t.lists).flat(), [ID]);
});

test('POST /border-tax → 403 SUBSCRIPTION_EXPIRED for a non-member, nothing queued', async () => {
  const t = makeApp();
  const res = await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u3')).send(body());
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'SUBSCRIPTION_EXPIRED');
  assert.deepEqual([t.rows.length, Object.values(t.lists).flat().length], [0, 0]);
});

test('POST /border-tax → 422 without the declaration / HR without distance; 401 unauthed', async () => {
  const t = makeApp();
  assert.equal((await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body({ declare: false }))).status, 422);
  assert.equal((await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body({ distanceKm: undefined }))).status, 422);
  assert.equal((await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body({ stateCd: 'RJ', checkpost: 'SADHUWALI', distanceKm: undefined }))).status, 422); // not live yet
  assert.equal((await request(t.app).post('/api/v1/border-tax').send(body())).status, 401);
});

test('GET /border-tax/:id → live captcha while waiting; other users get 404', async () => {
  const t = makeApp();
  await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  t.hashes[K.job(ID)] = { step: 'vahan', captcha: 'data:image/png;base64,AA', deadline: String(Date.now() + 60_000) };
  const res = await request(t.app).get(`/api/v1/border-tax/${ID}`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.filing.live.step, 'vahan');
  assert.equal(res.body.data.filing.live.captcha, 'data:image/png;base64,AA');
  assert.equal(res.body.data.filing.live.handoff, null);
  assert.equal((await request(t.app).get(`/api/v1/border-tax/${ID}`).set('Cookie', cookieFor('u2'))).status, 404);
});

test('GET /border-tax/:id → bank hand-off once HANDED_OFF, null after it expires', async () => {
  const t = makeApp();
  await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  const handoff = { method: 'POST', action: 'https://merchant.sbi.bank.in/merchant/merchantprelogin.htm', fields: [['encdata', 'e'], ['merchant_code', 'm']] };
  Object.assign(t.rows[0], { status: 'handed_off', taxPaise: 23000 });
  t.strings[K.handoff(ID)] = JSON.stringify(handoff);
  const get = () => request(t.app).get(`/api/v1/border-tax/${ID}`).set('Cookie', cookieFor('u1'));
  assert.deepEqual((await get()).body.data.filing.live.handoff, handoff);
  delete t.strings[K.handoff(ID)];
  assert.equal((await get()).body.data.filing.live.handoff, null);
});

test('POST /:id/captcha → 409 when nothing waits, 200 pushes the answer when one does', async () => {
  const t = makeApp();
  await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  const url = `/api/v1/border-tax/${ID}/captcha`;
  assert.equal((await request(t.app).post(url).set('Cookie', cookieFor('u1')).send({ answer: 'ab12cd' })).status, 409);
  t.hashes[K.job(ID)] = { step: 'vahan', captcha: 'data:,x' };
  assert.equal((await request(t.app).post(url).set('Cookie', cookieFor('u1')).send({ answer: 'ab12cd' })).status, 200);
  assert.deepEqual(t.lists[K.answer(ID)], ['ab12cd']);
  assert.equal((await request(t.app).post(url).set('Cookie', cookieFor('u1')).send({ answer: 'a b' })).status, 422);
  assert.equal((await request(t.app).post(url).set('Cookie', cookieFor('u1')).send({ answer: 'ss7#M@' })).status, 200);
});

test('POST /:id/captcha/refresh → 409 when nothing waits, 200 queues the refresh token; GET shows canRefresh', async () => {
  const t = makeApp();
  await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  const url = `/api/v1/border-tax/${ID}/captcha/refresh`;
  assert.equal((await request(t.app).post(url).set('Cookie', cookieFor('u1'))).status, 409);
  t.hashes[K.job(ID)] = { step: 'vahan', captcha: 'data:,x', refresh: '1' };
  assert.equal((await request(t.app).get(`/api/v1/border-tax/${ID}`).set('Cookie', cookieFor('u1'))).body.data.filing.live.canRefresh, true);
  assert.equal((await request(t.app).post(url).set('Cookie', cookieFor('u3'))).status, 404);
  assert.equal((await request(t.app).post(url).set('Cookie', cookieFor('u1'))).status, 200);
  assert.deepEqual(t.lists[K.answer(ID)], ['__refresh__']);
});

test('POST /:id/cancel → 200 while filling, 409 once handed off', async () => {
  const t = makeApp();
  await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  assert.equal((await request(t.app).post(`/api/v1/border-tax/${ID}/cancel`).set('Cookie', cookieFor('u1'))).status, 200);
  assert.equal(t.rows[0].status, 'cancelled');
  t.rows[0].status = 'handed_off';
  assert.equal((await request(t.app).post(`/api/v1/border-tax/${ID}/cancel`).set('Cookie', cookieFor('u1'))).status, 409);
});

test("GET /border-tax → the caller's filings + nextCursor meta", async () => {
  const t = makeApp();
  await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  const res = await request(t.app).get('/api/v1/border-tax?limit=5').set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.filings.length, 1);
  assert.equal(res.body.meta.nextCursor, null);
  assert.equal((await request(t.app).get('/api/v1/border-tax?cursor=garbage').set('Cookie', cookieFor('u1'))).status, 422);
});

test('POST /border-tax → 429 portal busy with meta.retryAfter while the lookup gap runs', async () => {
  const t = makeApp();
  t.rows.push({ id: 'other', userId: 'u2', vehicleNo: 'HR01A1', status: 'queued' });
  const res = await request(t.app).post('/api/v1/border-tax').set('Cookie', cookieFor('u1')).send(body());
  assert.equal(res.status, 429);
  assert.deepEqual([res.body.error.code, res.body.meta.retryAfter, Object.values(t.lists).flat().length], ['RATE_LIMITED', 120, 0]);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES } = require('@easecab/shared');
const { buildApp } = require('../../../app');
const { createJwt } = require('../../../lib/jwt');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'], cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  razorpay: { keyId: 'rzp_test_x', keySecret: 's'.repeat(16), webhookSecret: 'w'.repeat(16) },
};
const inertSubscriber = { on() {}, removeListener() {}, async subscribe() {}, async unsubscribe() {} };
const jwt = createJwt(CONFIG.jwt);
const authCookie = `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: 'u1', role: 'user' })}`;

const fakeR2 = {
  async presignPut({ key }) { return { url: `https://r2/put/${key}` }; },
  async headObject() { return { exists: true, size: 1024, contentType: 'image/jpeg' }; },
  publicUrl(key) { return `https://cdn.easecab.com/${key}`; },
};

function appWith() {
  return buildApp({
    prisma: {}, redis: { async eval() { return 1; } }, logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { verifyOtpToken: async () => ({ phone: '+919876543210' }) },
    subscriber: inertSubscriber,
    razorpay: { async createOrder() { return { id: 'order_new' }; } },
    surepass: {},
    uploads: fakeR2,
  });
}

test('POST /uploads/presign requires auth', async () => {
  const res = await request(appWith()).post('/api/v1/uploads/presign').send({ purpose: 'dp', contentType: 'image/jpeg' });
  assert.strictEqual(res.status, 401);
});

test('rejects an unknown purpose with 422 before any R2 call', async () => {
  const res = await request(appWith()).post('/api/v1/uploads/presign').set('Cookie', authCookie).send({ purpose: 'banner', contentType: 'image/jpeg' });
  assert.strictEqual(res.status, 422);
});

test('rejects a disallowed contentType for the purpose with 422', async () => {
  const res = await request(appWith()).post('/api/v1/uploads/presign').set('Cookie', authCookie).send({ purpose: 'dp', contentType: 'application/pdf' });
  assert.strictEqual(res.status, 422);
});

test('returns a presigned PUT url + namespaced key on success', async () => {
  const res = await request(appWith()).post('/api/v1/uploads/presign').set('Cookie', authCookie).send({ purpose: 'dp', contentType: 'image/jpeg' });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.key.startsWith('dp/u1/'));
  assert.strictEqual(res.body.data.url, `https://r2/put/${res.body.data.key}`);
  assert.strictEqual(res.body.data.fields, undefined);
  assert.strictEqual(res.body.data.publicUrl, `https://cdn.easecab.com/${res.body.data.key}`);
});

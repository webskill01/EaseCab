'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pino = require('pino');
const { ERROR_CODES } = require('@easecab/shared');
const { buildApp } = require('../app');

/** Build a real app with inert deps + a silent logger. */
function makeApp() {
  return buildApp({
    prisma: {},
    redis: {},
    logger: pino({ level: 'silent' }),
    config: {
      corsOrigins: ['https://easecab.com'],
      cookie: { secure: true },
      jwt: {
        accessSecret: 'a'.repeat(32),
        refreshSecret: 'b'.repeat(32),
        accessTtl: '15m',
        refreshTtl: '30d',
      },
    },
  });
}

test('GET /ping returns 200 in the success envelope with a request id header', async () => {
  const res = await request(makeApp()).get('/ping');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { success: true, data: { status: 'ok' } });
  assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/);
});

test('an unknown route returns the locked 404 envelope with meta.requestId', async () => {
  const res = await request(makeApp()).get('/api/v1/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, ERROR_CODES.NOT_FOUND);
  assert.ok(res.body.meta.requestId);
});

test('an unknown ROOT route is also a shaped 404 (notFound is terminal)', async () => {
  const res = await request(makeApp()).get('/totally-unknown');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, ERROR_CODES.NOT_FOUND);
});

test('does not expose the x-powered-by header', async () => {
  const res = await request(makeApp()).get('/ping');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('sets a helmet hardening header (x-content-type-options: nosniff)', async () => {
  const res = await request(makeApp()).get('/ping');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});

test('reflects an allow-listed CORS origin with credentials', async () => {
  const res = await request(makeApp()).get('/ping').set('Origin', 'https://easecab.com');
  assert.equal(res.headers['access-control-allow-origin'], 'https://easecab.com');
  assert.equal(res.headers['access-control-allow-credentials'], 'true');
});

test('does not reflect a non-allow-listed CORS origin', async () => {
  const res = await request(makeApp()).get('/ping').set('Origin', 'https://evil.example');
  assert.notEqual(res.headers['access-control-allow-origin'], 'https://evil.example');
});

test('echoes an inbound x-request-id into logs/response for tracing', async () => {
  const res = await request(makeApp()).get('/ping').set('x-request-id', 'trace-xyz');
  assert.equal(res.headers['x-request-id'], 'trace-xyz');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseServerEnv } = require('../env.schema');

// 32+ char secrets (schema floor — short secrets are trivially brute-forced).
const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(40);

const BASE = Object.freeze({
  DATABASE_URL: 'postgresql://u:p@host:6543/db?pgbouncer=true',
  REDIS_URL: 'redis://127.0.0.1:6379',
  JWT_ACCESS_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
});

test('accepts valid server env and freezes the result', () => {
  const r = parseServerEnv(BASE);
  assert.equal(r.success, true);
  assert.equal(r.data.JWT_ACCESS_SECRET, SECRET_A);
  assert.ok(Object.isFrozen(r.data));
});

test('still inherits the base contract (missing DATABASE_URL fails)', () => {
  const r = parseServerEnv({ ...BASE, DATABASE_URL: undefined });
  assert.equal(r.success, false);
  assert.ok(r.errors.some((e) => e.startsWith('DATABASE_URL')));
});

test('applies server defaults (NODE_ENV, PORT, TTLs, CORS) when omitted', () => {
  const r = parseServerEnv(BASE);
  assert.equal(r.success, true);
  assert.equal(r.data.NODE_ENV, 'development');
  assert.equal(r.data.PORT, 4000);
  assert.equal(r.data.JWT_ACCESS_TTL, '15m');
  assert.equal(r.data.JWT_REFRESH_TTL, '30d');
  // CORS_ORIGINS is parsed into a trimmed array of the three prod origins.
  assert.deepEqual(r.data.CORS_ORIGINS, [
    'https://easecab.com',
    'https://api.easecab.com',
    'https://admin.easecab.com',
  ]);
});

test('coerces PORT and splits CORS_ORIGINS csv into a trimmed array', () => {
  const r = parseServerEnv({
    ...BASE,
    PORT: '4100',
    CORS_ORIGINS: 'http://localhost:3000, https://easecab.com ',
  });
  assert.equal(r.success, true);
  assert.equal(r.data.PORT, 4100);
  assert.deepEqual(r.data.CORS_ORIGINS, ['http://localhost:3000', 'https://easecab.com']);
});

test('rejects a JWT_ACCESS_SECRET shorter than 32 chars, naming it (no value leaked)', () => {
  const r = parseServerEnv({ ...BASE, JWT_ACCESS_SECRET: 'short' });
  assert.equal(r.success, false);
  assert.ok(r.errors.some((e) => e.startsWith('JWT_ACCESS_SECRET')));
  assert.ok(!r.errors.some((e) => e.includes('short')));
});

test('rejects a missing JWT_REFRESH_SECRET, naming it', () => {
  const r = parseServerEnv({ ...BASE, JWT_REFRESH_SECRET: undefined });
  assert.equal(r.success, false);
  assert.ok(r.errors.some((e) => e.startsWith('JWT_REFRESH_SECRET')));
});

test('rejects an invalid NODE_ENV, naming it', () => {
  const r = parseServerEnv({ ...BASE, NODE_ENV: 'staging' });
  assert.equal(r.success, false);
  assert.ok(r.errors.some((e) => e.startsWith('NODE_ENV')));
});

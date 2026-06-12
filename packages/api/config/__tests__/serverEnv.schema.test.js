'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseServerEnv } = require('../env.schema');

// 32+ char secrets (schema floor — short secrets are trivially brute-forced).
const SECRET_A = 'a'.repeat(32);
const SECRET_B = 'b'.repeat(40);

// BASE includes the full required server env (Phase 3 Step 9 added FIREBASE_* fields).
// Tests that exercise "missing required field" spread BASE and delete/override the target.
const BASE = Object.freeze({
  DATABASE_URL: 'postgresql://u:p@host:6543/db?pgbouncer=true',
  REDIS_URL: 'redis://127.0.0.1:6379',
  JWT_ACCESS_SECRET: SECRET_A,
  JWT_REFRESH_SECRET: SECRET_B,
  FIREBASE_PROJECT_ID: 'easecab-test',
  FIREBASE_CLIENT_EMAIL: 'svc@easecab-test.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
  RAZORPAY_KEY_ID: 'rzp_test_abc123',
  RAZORPAY_KEY_SECRET: 'x'.repeat(16),
  RAZORPAY_WEBHOOK_SECRET: 'w'.repeat(16),
  SUREPASS_TOKEN: 't'.repeat(16),
  R2_ACCOUNT_ID: 'acc_test',
  R2_ACCESS_KEY_ID: 'akid_test',
  R2_SECRET_ACCESS_KEY: 's'.repeat(16),
  R2_BUCKET: 'easecab-test',
  R2_PUBLIC_BASE_URL: 'https://cdn.easecab.com',
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

test('serverEnvSchema requires the FIREBASE_* credentials', () => {
  // Build a base that has every required field EXCEPT the Firebase ones.
  const baseNoFirebase = {
    DATABASE_URL: BASE.DATABASE_URL,
    REDIS_URL: BASE.REDIS_URL,
    JWT_ACCESS_SECRET: BASE.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: BASE.JWT_REFRESH_SECRET,
  };
  // Missing all FIREBASE_* → fail
  assert.equal(parseServerEnv(baseNoFirebase).success, false);
  // With them → success, private key preserved verbatim (newline restore happens in firebaseAdmin)
  const ok = parseServerEnv({
    ...baseNoFirebase,
    FIREBASE_PROJECT_ID: 'easecab',
    FIREBASE_CLIENT_EMAIL: 'svc@easecab.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    RAZORPAY_KEY_ID: BASE.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: BASE.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: BASE.RAZORPAY_WEBHOOK_SECRET,
    SUREPASS_TOKEN: BASE.SUREPASS_TOKEN,
    R2_ACCOUNT_ID: BASE.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: BASE.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: BASE.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: BASE.R2_BUCKET,
    R2_PUBLIC_BASE_URL: BASE.R2_PUBLIC_BASE_URL,
  });
  assert.equal(ok.success, true);
  assert.equal(ok.data.FIREBASE_PROJECT_ID, 'easecab');
});

test('serverEnvSchema requires the R2 upload credentials', () => {
  const r = parseServerEnv({ ...BASE, R2_ACCOUNT_ID: undefined });
  assert.equal(r.success, false);
  assert.ok(r.errors.some((e) => e.startsWith('R2_ACCOUNT_ID')));
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ERROR_CODES,
  ERROR_CATALOG,
  HTTP_STATUS,
  RIDE_STATUS,
  SUBSCRIPTION_STATUS,
  REDIS_PREFIX,
  redisKey,
  RIDE_TIMING,
} = require('../index');

test('ERROR_CODES contains the locked API error codes (CLAUDE.md §8)', () => {
  for (const code of [
    'AUTH_REQUIRED',
    'SUBSCRIPTION_EXPIRED',
    'VERIFICATION_REQUIRED',
    'RATE_LIMITED',
    'NOT_FOUND',
    'VALIDATION_ERROR',
    'INTERNAL_ERROR',
  ]) {
    assert.equal(ERROR_CODES[code], code);
  }
});

test('constants are frozen — cannot be mutated', () => {
  assert.ok(Object.isFrozen(ERROR_CODES));
  assert.ok(Object.isFrozen(RIDE_STATUS));
  assert.throws(() => {
    'use strict';
    ERROR_CODES.AUTH_REQUIRED = 'hacked';
  }, TypeError);
});

test('ERROR_CATALOG maps every error code to a status and message', () => {
  for (const code of Object.values(ERROR_CODES)) {
    const entry = ERROR_CATALOG[code];
    assert.ok(entry, `missing catalog entry for ${code}`);
    assert.equal(typeof entry.status, 'number');
    assert.equal(typeof entry.message, 'string');
  }
});

test('RIDE_STATUS mirrors the Prisma RideStatus enum exactly', () => {
  assert.deepEqual(Object.values(RIDE_STATUS).sort(), ['booked', 'fresh', 'hidden']);
});

test('SUBSCRIPTION_STATUS mirrors the Prisma SubscriptionStatus enum exactly', () => {
  assert.deepEqual(
    Object.values(SUBSCRIPTION_STATUS).sort(),
    ['active', 'cancelled', 'expired', 'halted', 'trial'],
  );
});

test('HTTP_STATUS exposes the codes the API uses', () => {
  assert.equal(HTTP_STATUS.OK, 200);
  assert.equal(HTTP_STATUS.UNAUTHORIZED, 401);
  assert.equal(HTTP_STATUS.TOO_MANY_REQUESTS, 429);
  assert.equal(HTTP_STATUS.INTERNAL_SERVER_ERROR, 500);
});

test('RIDE_TIMING exposes frozen ride lifecycle durations', () => {
  assert.ok(Object.isFrozen(RIDE_TIMING));
  assert.equal(RIDE_TIMING.BOOKED_AFTER_MIN, 5);
  assert.equal(RIDE_TIMING.FEED_TTL_MIN, 30);
  assert.equal(RIDE_TIMING.HARD_DELETE_HRS, 12);
  assert.equal(RIDE_TIMING.FINGERPRINT_TTL_HRS, 12);
});

test('REDIS_PREFIX namespaces the shared Redis box', () => {
  assert.equal(REDIS_PREFIX, 'easecab:');
});

test('redisKey joins parts under the easecab: namespace', () => {
  assert.equal(redisKey('otp', '9876543210'), 'easecab:otp:9876543210');
  assert.equal(redisKey('cities'), 'easecab:cities');
});

test('redisKey rejects empty or non-string parts', () => {
  assert.throws(() => redisKey(), /at least one/i);
  assert.throws(() => redisKey('otp', ''), /non-empty string/i);
  assert.throws(() => redisKey('otp', 123), /non-empty string/i);
});

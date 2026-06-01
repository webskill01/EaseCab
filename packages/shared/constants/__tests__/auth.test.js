// packages/shared/constants/__tests__/auth.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { AUTH_COOKIES, OTP_RATE_LIMIT, TRIAL_DAYS, USER_ROLE } = require('../auth');

test('AUTH_COOKIES unchanged', () => {
  assert.strictEqual(AUTH_COOKIES.ACCESS_TOKEN, 'ec_at');
  assert.strictEqual(AUTH_COOKIES.REFRESH_TOKEN, 'ec_rt');
});

test('OTP_RATE_LIMIT matches CLAUDE.md §6', () => {
  assert.strictEqual(OTP_RATE_LIMIT.MAX_PER_HOUR, 3);
  assert.strictEqual(OTP_RATE_LIMIT.WINDOW_SEC, 3600);
  assert.strictEqual(OTP_RATE_LIMIT.RESEND_COOLDOWN_SEC, 30);
});

test('trial + role constants', () => {
  assert.strictEqual(TRIAL_DAYS, 7);
  assert.strictEqual(USER_ROLE, 'user');
});

test('constants are frozen', () => {
  assert.ok(Object.isFrozen(OTP_RATE_LIMIT));
  assert.throws(() => { OTP_RATE_LIMIT.MAX_PER_HOUR = 9; });
});

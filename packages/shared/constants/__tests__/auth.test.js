// packages/shared/constants/__tests__/auth.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  AUTH_COOKIES,
  OTP_RATE_LIMIT,
  TRIAL_DAYS,
  USER_ROLE,
  ADMIN_AUTH_COOKIES,
  ADMIN_ROLE,
  ADMIN_LOGIN_RATE_LIMIT,
} = require('../auth');

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

test('ADMIN_AUTH_COOKIES are distinct from user cookies', () => {
  assert.strictEqual(ADMIN_AUTH_COOKIES.ACCESS_TOKEN, 'ec_admin_at');
  assert.strictEqual(ADMIN_AUTH_COOKIES.REFRESH_TOKEN, 'ec_admin_rt');
  assert.notStrictEqual(ADMIN_AUTH_COOKIES.ACCESS_TOKEN, AUTH_COOKIES.ACCESS_TOKEN);
});

test('ADMIN_ROLE and login rate limit are frozen', () => {
  assert.strictEqual(ADMIN_ROLE, 'admin');
  assert.strictEqual(ADMIN_LOGIN_RATE_LIMIT.MAX_PER_WINDOW, 5);
  assert.strictEqual(ADMIN_LOGIN_RATE_LIMIT.WINDOW_SEC, 900);
  assert.throws(() => { ADMIN_LOGIN_RATE_LIMIT.MAX_PER_WINDOW = 9; });
});

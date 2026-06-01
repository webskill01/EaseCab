'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AppError, ERROR_CODES, AUTH_COOKIES } = require('@easecab/shared');
const { createJwt } = require('../../lib/jwt');
const { createRequireAuth } = require('../requireAuth');

const jwt = createJwt({
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'b'.repeat(32),
  accessTtl: '15m',
  refreshTtl: '30d',
});
const requireAuth = createRequireAuth({ jwt });

test('rejects a request with no access cookie as AUTH_REQUIRED', () => {
  let forwarded = null;
  requireAuth({ cookies: {} }, {}, (e) => {
    forwarded = e;
  });
  assert.ok(forwarded instanceof AppError);
  assert.equal(forwarded.code, ERROR_CODES.AUTH_REQUIRED);
});

test('accepts a valid access token and attaches req.user', () => {
  const token = jwt.signAccess({ sub: 'user-9', role: 'user' });
  const req = { cookies: { [AUTH_COOKIES.ACCESS_TOKEN]: token } };
  let err = 'untouched';
  requireAuth(req, {}, (e) => {
    err = e;
  });
  assert.equal(err, undefined); // next() with no error
  assert.equal(req.user.id, 'user-9');
  assert.equal(req.user.role, 'user');
});

test('rejects a tampered/invalid token as AUTH_REQUIRED (never leaks jwt detail)', () => {
  const req = { cookies: { [AUTH_COOKIES.ACCESS_TOKEN]: 'not.a.jwt' } };
  let forwarded = null;
  requireAuth(req, {}, (e) => {
    forwarded = e;
  });
  assert.ok(forwarded instanceof AppError);
  assert.equal(forwarded.code, ERROR_CODES.AUTH_REQUIRED);
});

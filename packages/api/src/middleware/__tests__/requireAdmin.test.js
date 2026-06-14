'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createJwt } = require('../../lib/jwt');
const { createRequireAdmin } = require('../requireAdmin');
const { ADMIN_AUTH_COOKIES, ADMIN_ROLE } = require('@easecab/shared');

const jwt = createJwt({ accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '8h' });

function run(cookies) {
  const req = { cookies };
  let nextArg = 'UNCALLED';
  createRequireAdmin({ jwt })(req, {}, (e) => { nextArg = e; });
  return { req, nextArg };
}

test('valid admin access cookie → req.admin set, next() with no error', () => {
  const token = jwt.signAccess({ sub: 'adm1', role: 'super', email: 'a@x.com', kind: ADMIN_ROLE });
  const { req, nextArg } = run({ [ADMIN_AUTH_COOKIES.ACCESS_TOKEN]: token });
  assert.strictEqual(nextArg, undefined);
  assert.deepStrictEqual(req.admin, { id: 'adm1', role: 'super', email: 'a@x.com' });
});

test('a token signed with the admin secret but WITHOUT kind:admin is rejected', () => {
  const token = jwt.signAccess({ sub: 'svc1', role: 'super', email: 's@x.com' });
  const { nextArg } = run({ [ADMIN_AUTH_COOKIES.ACCESS_TOKEN]: token });
  assert.strictEqual(nextArg.code, 'AUTH_REQUIRED');
});

test('a token with a non-admin kind is rejected', () => {
  const token = jwt.signAccess({ sub: 'u1', role: 'user', email: 'u@x.com', kind: 'user' });
  const { nextArg } = run({ [ADMIN_AUTH_COOKIES.ACCESS_TOKEN]: token });
  assert.strictEqual(nextArg.code, 'AUTH_REQUIRED');
});

test('missing cookie → AUTH_REQUIRED', () => {
  const { nextArg } = run({});
  assert.strictEqual(nextArg.code, 'AUTH_REQUIRED');
});

test('a USER token (signed with a different secret) in the admin slot is rejected', () => {
  const userJwt = createJwt({ accessSecret: 'u'.repeat(32), refreshSecret: 'v'.repeat(32), accessTtl: '15m', refreshTtl: '30d' });
  const token = userJwt.signAccess({ sub: 'u1', role: 'user' });
  const { nextArg } = run({ [ADMIN_AUTH_COOKIES.ACCESS_TOKEN]: token });
  assert.strictEqual(nextArg.code, 'AUTH_REQUIRED');
});

test('a garbage token → AUTH_REQUIRED', () => {
  const { nextArg } = run({ [ADMIN_AUTH_COOKIES.ACCESS_TOKEN]: 'not.a.jwt' });
  assert.strictEqual(nextArg.code, 'AUTH_REQUIRED');
});

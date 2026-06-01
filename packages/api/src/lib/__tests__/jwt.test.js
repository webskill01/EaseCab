'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createJwt } = require('../jwt');

const CONFIG = Object.freeze({
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'b'.repeat(32),
  accessTtl: '15m',
  refreshTtl: '30d',
});

test('signAccess -> verifyAccess round-trips the payload claims', () => {
  const jwt = createJwt(CONFIG);
  const token = jwt.signAccess({ sub: 'user-1', role: 'user' });
  const decoded = jwt.verifyAccess(token);
  assert.equal(decoded.sub, 'user-1');
  assert.equal(decoded.role, 'user');
  assert.ok(decoded.iat && decoded.exp); // jsonwebtoken stamps both
});

test('signRefresh -> verifyRefresh round-trips', () => {
  const jwt = createJwt(CONFIG);
  const token = jwt.signRefresh({ sub: 'user-1' });
  assert.equal(jwt.verifyRefresh(token).sub, 'user-1');
});

test('an access token is NOT accepted by verifyRefresh (separate secrets)', () => {
  const jwt = createJwt(CONFIG);
  const access = jwt.signAccess({ sub: 'user-1' });
  assert.throws(() => jwt.verifyRefresh(access));
});

test('a tampered token fails verification', () => {
  const jwt = createJwt(CONFIG);
  const token = jwt.signAccess({ sub: 'user-1' });
  const tampered = `${token}x`;
  assert.throws(() => jwt.verifyAccess(tampered));
});

test('an expired token throws on verify', () => {
  const jwt = createJwt({ ...CONFIG, accessTtl: '-1s' }); // already expired
  const token = jwt.signAccess({ sub: 'user-1' });
  assert.throws(() => jwt.verifyAccess(token), /expired/i);
});

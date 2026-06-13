'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { ERROR_CODES } = require('@easecab/shared');
const { createAuthService, toPublicUser } = require('../auth.service');

const jwtStub = {
  signAccess: (p) => `acc:${p.sub}:${p.role}`,
  signRefresh: (p) => `ref:${p.sub}`,
  verifyRefresh: (t) => { if (t === 'good') return { sub: 'u1' }; throw new Error('bad'); },
};

function baseRepo(overrides = {}) {
  return {
    getResendCooldownTtl: async () => -2,
    incrementOtpCount: async () => 1,
    setResendCooldown: async () => {},
    findUserByPhone: async () => null,
    findActiveUserById: async () => ({ id: 'u1' }),
    createUserWithTrial: async (phone) => ({ id: 'new', phone, isDeleted: false, subscription: { status: 'trial' } }),
    restoreUser: async (id) => ({ id, isDeleted: false }),
    ...overrides,
  };
}

const make = (repo, identity) => createAuthService({
  repo, jwt: jwtStub, identity, config: {}, // config currently unused by service
});

test('requestOtp passes the gate and arms the cooldown', async () => {
  let armed = false;
  const svc = make(baseRepo({ setResendCooldown: async () => { armed = true; } }), null);
  assert.deepStrictEqual(await svc.requestOtp('+919876543210'), { sent: true });
  assert.strictEqual(armed, true);
});

test('requestOtp throws RATE_LIMITED while the resend cooldown is active', async () => {
  const svc = make(baseRepo({ getResendCooldownTtl: async () => 12 }), null);
  await assert.rejects(svc.requestOtp('+919876543210'), (e) => e.code === ERROR_CODES.RATE_LIMITED);
});

test('requestOtp throws RATE_LIMITED once over the hourly cap', async () => {
  const svc = make(baseRepo({ incrementOtpCount: async () => 4 }), null);
  await assert.rejects(svc.requestOtp('+919876543210'), (e) => e.code === ERROR_CODES.RATE_LIMITED);
});

test('verifyOtp on a new phone creates a trial user and signs tokens', async () => {
  const identity = { verifyOtpToken: async () => ({ phone: '+919876543210' }) };
  const svc = make(baseRepo(), identity);
  const r = await svc.verifyOtp('idtok');
  assert.strictEqual(r.isNewUser, true);
  assert.strictEqual(r.user.phone, '+919876543210');
  assert.strictEqual(r.accessToken, 'acc:new:user');
  assert.strictEqual(r.refreshToken, 'ref:new');
});

test('verifyOtp on an existing active user does not recreate', async () => {
  const identity = { verifyOtpToken: async () => ({ phone: '+919876543210' }) };
  const svc = make(baseRepo({ findUserByPhone: async () => ({ id: 'u1', phone: '+919876543210', isDeleted: false }) }), identity);
  const r = await svc.verifyOtp('idtok');
  assert.strictEqual(r.isNewUser, false);
  assert.strictEqual(r.accessToken, 'acc:u1:user');
});

test('verifyOtp restores a soft-deleted user', async () => {
  let restored = null;
  const identity = { verifyOtpToken: async () => ({ phone: '+919876543210' }) };
  const svc = make(baseRepo({
    findUserByPhone: async () => ({ id: 'u9', phone: '+919876543210', isDeleted: true }),
    restoreUser: async (id) => { restored = id; return { id, phone: '+919876543210', isDeleted: false }; },
  }), identity);
  const r = await svc.verifyOtp('idtok');
  assert.strictEqual(restored, 'u9');
  assert.strictEqual(r.isNewUser, false);
});

test('verifyOtp maps a bad Firebase token to AUTH_REQUIRED (no leak)', async () => {
  const identity = { verifyOtpToken: async () => { throw new Error('firebase exploded with secret detail'); } };
  const svc = make(baseRepo(), identity);
  await assert.rejects(svc.verifyOtp('idtok'), (e) => e.code === ERROR_CODES.AUTH_REQUIRED && !/secret/.test(e.message));
});

test('refresh rotates tokens for a valid refresh cookie', async () => {
  const svc = make(baseRepo(), null);
  const r = await svc.refresh('good');
  assert.strictEqual(r.accessToken, 'acc:u1:user');
  assert.strictEqual(r.refreshToken, 'ref:u1');
});

test('refresh rejects missing / invalid / unknown-user tokens as AUTH_REQUIRED', async () => {
  const svc = make(baseRepo(), null);
  await assert.rejects(svc.refresh(undefined), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
  await assert.rejects(svc.refresh('bad'), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
  const svc2 = make(baseRepo({ findActiveUserById: async () => null }), null);
  await assert.rejects(svc2.refresh('good'), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
});

test('mintFirebaseToken returns a custom token for the user id', async () => {
  const identity = { mintCustomToken: async (uid) => `ct:${uid}` };
  const svc = make(baseRepo(), identity);
  assert.deepStrictEqual(await svc.mintFirebaseToken('user-123'), { token: 'ct:user-123' });
});

test('toPublicUser exposes only safe fields', () => {
  const pub = toPublicUser({
    id: 'u1', phone: '+91x', name: 'A', verificationStatus: 'none', isDeleted: false,
    subscription: { status: 'trial', trialExpiresAt: 't', expiresAt: null, razorpaySubId: 'SECRET' },
  });
  assert.deepStrictEqual(pub, {
    id: 'u1', phone: '+91x', name: 'A', verificationStatus: 'none',
    subscription: { status: 'trial', trialExpiresAt: 't', expiresAt: null },
  });
});

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
  assert.deepStrictEqual(await svc.requestOtp('+919876543210'), { sent: true, channel: 'firebase' });
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
  const r = await svc.verifyOtp({ idToken: 'idtok' });
  assert.strictEqual(r.isNewUser, true);
  assert.strictEqual(r.user.phone, '+919876543210');
  assert.strictEqual(r.accessToken, 'acc:new:user');
  assert.strictEqual(r.refreshToken, 'ref:new');
});

test('verifyOtp on an existing active user does not recreate', async () => {
  const identity = { verifyOtpToken: async () => ({ phone: '+919876543210' }) };
  const svc = make(baseRepo({ findUserByPhone: async () => ({ id: 'u1', phone: '+919876543210', isDeleted: false }) }), identity);
  const r = await svc.verifyOtp({ idToken: 'idtok' });
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
  const r = await svc.verifyOtp({ idToken: 'idtok' });
  assert.strictEqual(restored, 'u9');
  assert.strictEqual(r.isNewUser, false);
});

test('verifyOtp maps a bad Firebase token to AUTH_REQUIRED (no leak)', async () => {
  const identity = { verifyOtpToken: async () => { throw new Error('firebase exploded with secret detail'); } };
  const svc = make(baseRepo(), identity);
  await assert.rejects(svc.verifyOtp({ idToken: 'idtok' }), (e) => e.code === ERROR_CODES.AUTH_REQUIRED && !/secret/.test(e.message));
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

// --- 2Factor server-side OTP (Phase 16.5) -----------------------------------
const PHONE = '+919812345678';
const REVIEWER = { phone: '+919876543210', code: '424242' };

function smsRepo(overrides = {}) {
  const sessions = new Map();
  let attempts = 0;
  return baseRepo({
    saveOtpSession: async (p, id) => { sessions.set(p, id); },
    getOtpSession: async (p) => sessions.get(p) ?? null,
    deleteOtpSession: async (p) => { sessions.delete(p); },
    incrementVerifyAttempts: async () => ++attempts,
    sessions,
    ...overrides,
  });
}
const fakeSms = (sent = []) => ({
  sendOtp: async (p) => { sent.push(p); return 'sess-1'; },
  verifyOtp: async (id, otp) => id === 'sess-1' && otp === '123456',
});
const makeSms = (repo, smsOtp, testLogin = null) =>
  createAuthService({ repo, jwt: jwtStub, identity: null, smsOtp, testLogin });

test('twofactor: requestOtp sends, binds the session to the phone, returns channel=server', async () => {
  const sent = [];
  const repo = smsRepo();
  const r = await makeSms(repo, fakeSms(sent)).requestOtp(PHONE);
  assert.deepStrictEqual(r, { sent: true, channel: 'server' });
  assert.deepStrictEqual(sent, [PHONE]);
  assert.strictEqual(repo.sessions.get(PHONE), 'sess-1');
});

test('twofactor: rate limit still blocks before any SMS is sent', async () => {
  const sent = [];
  const svc = makeSms(smsRepo({ incrementOtpCount: async () => 4 }), fakeSms(sent));
  await assert.rejects(svc.requestOtp(PHONE), (e) => e.code === ERROR_CODES.RATE_LIMITED);
  assert.deepStrictEqual(sent, []);
});

test('twofactor: right code signs in and burns the session (no replay)', async () => {
  const repo = smsRepo();
  const svc = makeSms(repo, fakeSms());
  await svc.requestOtp(PHONE);
  const r = await svc.verifyOtp({ phone: PHONE, otp: '123456' });
  assert.strictEqual(r.user.phone, PHONE);
  assert.strictEqual(r.isNewUser, true);
  await assert.rejects(svc.verifyOtp({ phone: PHONE, otp: '123456' }), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
});

test('twofactor: wrong code → AUTH_REQUIRED', async () => {
  const svc = makeSms(smsRepo(), fakeSms());
  await svc.requestOtp(PHONE);
  await assert.rejects(svc.verifyOtp({ phone: PHONE, otp: '000000' }), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
});

test('twofactor: a code cannot be used for a phone it was not sent to', async () => {
  const svc = makeSms(smsRepo(), fakeSms());
  await svc.requestOtp(PHONE);
  await assert.rejects(svc.verifyOtp({ phone: '+919999999999', otp: '123456' }), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
});

test('twofactor: verify attempts are capped (brute-force guard)', async () => {
  const svc = makeSms(smsRepo({ incrementVerifyAttempts: async () => 6 }), fakeSms());
  await assert.rejects(svc.verifyOtp({ phone: PHONE, otp: '123456' }), (e) => e.code === ERROR_CODES.RATE_LIMITED);
});

test('twofactor: reviewer number gets no SMS and signs in with the fixed code only', async () => {
  const sent = [];
  const svc = makeSms(smsRepo(), fakeSms(sent), REVIEWER);
  assert.deepStrictEqual(await svc.requestOtp(REVIEWER.phone), { sent: true, channel: 'server' });
  assert.deepStrictEqual(sent, []);
  await assert.rejects(svc.verifyOtp({ phone: REVIEWER.phone, otp: '123456' }), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
  const r = await svc.verifyOtp({ phone: REVIEWER.phone, otp: REVIEWER.code });
  assert.strictEqual(r.user.phone, REVIEWER.phone);
});

test('firebase mode: phone+code body is refused (no server OTP configured)', async () => {
  const svc = make(smsRepo(), null);
  await assert.rejects(svc.verifyOtp({ phone: PHONE, otp: '123456' }), (e) => e.code === ERROR_CODES.AUTH_REQUIRED);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ERROR_CODES } = require('@easecab/shared');
const { createReferralsService } = require('../referrals.service');

const NOW = new Date('2026-10-20T06:00:00Z').getTime();
const DAY = 86_400_000;

function fakeRepo(over = {}) {
  const calls = { granted: null, set: null, pushed: null };
  const repo = {
    calls,
    incrClaimAttempts: async () => 1,
    findClaimant: async () => ({ id: 'me', phone: '+919000000001', createdAt: new Date(NOW - DAY), referredById: null }),
    findUserByPhone: async () => ({ id: 'ref', name: 'SUNIL' }),
    setReferrer: async (a) => { calls.set = a; return true; },
    findReferrerId: async () => 'ref',
    listUnrewardedPaidReferees: async () => [],
    findSubscription: async () => null,
    grantReward: async (a) => { calls.granted = a; return true; },
    invalidateSubCache: async () => {},
    listDeviceTokens: async () => ['t1'],
    ...over,
  };
  return repo;
}
const ALL = { all: true, phones: [] };
const pushSender = (calls) => ({ async sendToTokens(a) { calls.pushed = a; return { successCount: 1, staleTokens: [] }; } });

test('rewardFor: nothing until 2 referees have paid', async () => {
  const repo = fakeRepo({ listUnrewardedPaidReferees: async () => ['a'] });
  assert.deepEqual(await createReferralsService({ access: ALL, repo }).rewardFor('a'), { months: 0 });
  assert.equal(repo.calls.granted, null);
});

test('rewardFor: 2 paid referees → +30 days, both spent, push sent', async () => {
  const repo = fakeRepo({ listUnrewardedPaidReferees: async () => ['a', 'b', 'c'] });
  const out = await createReferralsService({ access: ALL, repo, pushSender: pushSender(repo.calls) }).rewardFor('b');
  assert.deepEqual(out, { months: 1 });
  assert.deepEqual(repo.calls.granted.refereeIds, ['a', 'b']); // c waits for a partner
  const days = (repo.calls.granted.newExpiresAt - Date.now()) / DAY;
  assert.ok(days > 29.9 && days <= 30);
  assert.equal(repo.calls.pushed.data.url, '/refer');
});

test('rewardFor: 4 paid referees at once → 2 months stacked on an active plan', async () => {
  const expiresAt = new Date(Date.now() + 10 * DAY);
  const repo = fakeRepo({
    listUnrewardedPaidReferees: async () => ['a', 'b', 'c', 'd'],
    findSubscription: async () => ({ status: 'active', expiresAt, paidStartedAt: new Date(0) }),
  });
  assert.deepEqual(await createReferralsService({ access: ALL, repo }).rewardFor('d'), { months: 2 });
  assert.equal(repo.calls.granted.newExpiresAt.getTime(), expiresAt.getTime() + 60 * DAY);
});

test('rewardFor: no referrer, no work', async () => {
  const repo = fakeRepo({ findReferrerId: async () => null });
  assert.deepEqual(await createReferralsService({ access: ALL, repo }).rewardFor('x'), { months: 0 });
});

test('rewardFor: lost race grants nothing and sends no push', async () => {
  const repo = fakeRepo({ listUnrewardedPaidReferees: async () => ['a', 'b'], grantReward: async () => false });
  const svc = createReferralsService({ access: ALL, repo, pushSender: pushSender(repo.calls) });
  assert.deepEqual(await svc.rewardFor('a'), { months: 0 });
  assert.equal(repo.calls.pushed, null);
});

test('claim: sets the referrer and returns their name', async () => {
  const repo = fakeRepo();
  const out = await createReferralsService({ access: ALL, repo }).claim('me', { phone: '+919877669671' }, NOW);
  assert.deepEqual(out, { referrer: { name: 'SUNIL' } });
  assert.deepEqual(repo.calls.set, { userId: 'me', referrerId: 'ref' });
});

const rejectsWith = (p, status) => assert.rejects(p, (e) => e.statusCode === status);

test('claim: refuses after the 7-day window', async () => {
  const repo = fakeRepo({ findClaimant: async () => ({ id: 'me', phone: '+919000000001', createdAt: new Date(NOW - 8 * DAY), referredById: null }) });
  await rejectsWith(createReferralsService({ access: ALL, repo }).claim('me', { phone: '+919877669671' }, NOW), 422);
});

test('claim: refuses yourself, a second claim, an unknown number and the reviewer', async () => {
  await rejectsWith(createReferralsService({ access: ALL, repo: fakeRepo({ findUserByPhone: async () => ({ id: 'me' }) }) }).claim('me', { phone: '+919877669671' }, NOW), 422);
  await rejectsWith(createReferralsService({ access: ALL, repo: fakeRepo({ findClaimant: async () => ({ phone: '+919000000001', createdAt: new Date(NOW), referredById: 'x' }) }) }).claim('me', { phone: '+919877669671' }, NOW), 409);
  await rejectsWith(createReferralsService({ access: ALL, repo: fakeRepo({ findUserByPhone: async () => null }) }).claim('me', { phone: '+919877669671' }, NOW), 404);
  await rejectsWith(createReferralsService({ access: ALL, repo: fakeRepo() }).claim('me', { phone: '+919876543210' }, NOW), 404);
});

test('claim: founder number is blocked unless it is a listed tester', async () => {
  const founder = '+916283380110';
  await rejectsWith(createReferralsService({ access: ALL, repo: fakeRepo() }).claim('me', { phone: founder }, NOW), 404);
  const access = { all: false, phones: ['+919000000001', founder] };
  const repo = fakeRepo({ findClaimant: async () => ({ phone: '+919000000001', createdAt: new Date(NOW), referredById: null }) });
  assert.ok((await createReferralsService({ access, repo }).claim('me', { phone: founder }, NOW)).referrer);
});

test('claim: rate limited after 5 tries an hour', async () => {
  const repo = fakeRepo({ incrClaimAttempts: async () => 6 });
  await assert.rejects(createReferralsService({ access: ALL, repo }).claim('me', { phone: '+919877669671' }, NOW), (e) => e.code === ERROR_CODES.RATE_LIMITED);
});

test('overview: progress, months earned and claim window', async () => {
  const at = new Date(NOW - DAY);
  const row = (id, paid, rewarded) => ({ id, name: id, createdAt: at, referralRewardedAt: rewarded ? at : null, _count: { payments: paid ? 1 : 0, paymentsOnBehalf: 0 } });
  const repo = fakeRepo({
    listReferrals: async () => ({
      rows: [row('a', true, true), row('b', true, true), row('c', true, false), row('d', false, false)],
      me: { phone: '+919000000001', createdAt: at, referredBy: null },
    }),
  });
  const out = await createReferralsService({ access: ALL, repo }).overview('me', NOW);
  assert.equal(out.monthsEarned, 1);
  assert.equal(out.towardNext, 1);
  assert.equal(out.perReward, 2);
  assert.equal(out.canClaim, true);
  assert.equal(out.referrals[3].paid, false);
});

test('rollout gate: outsiders get enabled:false and cannot claim; listed testers can', async () => {
  const testers = { all: false, phones: ['+919000000001'] };
  const listed = fakeRepo({ listReferrals: async () => ({ rows: [], me: { phone: '+919000000001', createdAt: new Date(NOW), referredBy: null } }) });
  assert.equal((await createReferralsService({ repo: listed, access: testers }).overview('me', NOW)).enabled, true);
  const outsider = fakeRepo({
    listReferrals: async () => ({ rows: [], me: { phone: '+919111111111', createdAt: new Date(NOW), referredBy: null } }),
    findClaimant: async () => ({ id: 'me', phone: '+919111111111', createdAt: new Date(NOW), referredById: null }),
  });
  const svc = createReferralsService({ repo: outsider, access: testers });
  assert.deepEqual(await svc.overview('me', NOW), { enabled: false });
  await rejectsWith(svc.claim('me', { phone: '+919877669671' }, NOW), 404);
  assert.equal(outsider.calls.set, null);
});

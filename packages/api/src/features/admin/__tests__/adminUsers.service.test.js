'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminUsersService } = require('../adminUsers.service');

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ROW = {
  id: USER_ID, name: 'Gurpreet', phone: '+919876543210', aadhaarVerified: true,
  verificationStatus: 'approved', baseCity: 'Amritsar', vehicleType: 'sedan',
  createdAt: new Date(), isDeleted: false, deletedAt: null,
  subscription: { status: 'active', expiresAt: new Date('2026-07-01') },
};

function fakeRepo(overrides = {}) {
  const calls = { setDeleted: [] };
  const repo = {
    async listUsers() { return { rows: [ROW], total: 1 }; },
    async findById(id) { return id === USER_ID ? ROW : null; },
    async setDeleted(id, flag) { calls.setDeleted.push([id, flag]); return { ...ROW, isDeleted: flag }; },
    ...overrides,
  };
  return { repo, calls };
}

test('list returns the full phone and flattens subscription validUntil', async () => {
  const { repo } = fakeRepo();
  const svc = createAdminUsersService({ repo });
  const out = await svc.list({ page: 1, limit: 20, status: 'active' });
  assert.strictEqual(out.total, 1);
  const u = out.items[0];
  assert.strictEqual(u.phone, '+919876543210');
    assert.strictEqual(u.subscription.status, 'active');
  assert.deepStrictEqual(u.subscription.validUntil, new Date('2026-07-01'));
});

test('list returns null subscription when the user has none', async () => {
  const { repo } = fakeRepo({ async listUsers() { return { rows: [{ ...ROW, subscription: null }], total: 1 }; } });
  const svc = createAdminUsersService({ repo });
  const out = await svc.list({ page: 1, limit: 20, status: 'all' });
  assert.strictEqual(out.items[0].subscription, null);
});

test('setStatus(delete) flips the flag and returns the user', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminUsersService({ repo });
  const out = await svc.setStatus(USER_ID, { action: 'delete' });
  assert.deepStrictEqual(calls.setDeleted[0], [USER_ID, true]);
  assert.strictEqual(out.isDeleted, true);
  assert.strictEqual(out.phone, '+919876543210');
});

test('setStatus(restore) clears the flag', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminUsersService({ repo });
  await svc.setStatus(USER_ID, { action: 'restore' });
  assert.deepStrictEqual(calls.setDeleted[0], [USER_ID, false]);
});

test('setStatus on a missing user → NOT_FOUND', async () => {
  const { repo } = fakeRepo();
  const svc = createAdminUsersService({ repo });
  await assert.rejects(() => svc.setStatus('missing', { action: 'delete' }), /NOT_FOUND|not found/i);
});

test('list presigns the profile pic best-effort and never returns the raw key', async () => {
  const { repo } = fakeRepo({ async listUsers() { return { rows: [{ ...ROW, profilePicUrl: 'dp/1.jpg' }, { ...ROW, profilePicUrl: null }], total: 2 }; } });
  const r2 = { async presignGet({ key }) { return `https://signed/${key}`; } };
  const out = await createAdminUsersService({ repo, r2 }).list({ page: 1, limit: 20, status: 'all' });
  assert.strictEqual(out.items[0].avatarUrl, 'https://signed/dp/1.jpg');
  assert.strictEqual(out.items[1].avatarUrl, null);
  assert.strictEqual('profilePicUrl' in out.items[0], false);
});

test('detail returns rupee payments, images and counts; NOT_FOUND for unknown id', async () => {
  const detail = { ...ROW, profilePicUrl: null, licenseUrl: 'kyc/l.jpg', rcUrl: null, carFrontUrl: null, carBackUrl: null,
    payments: [{ id: 'p1', amount: 14900, status: 'captured', createdAt: new Date() }], _count: { postedRides: 3 } };
  const { repo } = fakeRepo({ async findDetail(id) { return id === USER_ID ? detail : null; } });
  const r2 = { async presignGet() { throw new Error('r2 down'); } };
  const svc = createAdminUsersService({ repo, r2 });
  const u = await svc.detail(USER_ID);
  assert.strictEqual(u.payments[0].amount, 149);
  assert.deepStrictEqual(u.images, { licence: null, rc: null, carFront: null, carBack: null });
  assert.deepStrictEqual(u.counts, { postedRides: 3 });
    await assert.rejects(svc.detail('missing'), (e) => e.code === 'NOT_FOUND');
});

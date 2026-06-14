'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminUsersService } = require('../adminUsers.service');

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ROW = {
  id: USER_ID, name: 'Gurpreet', phone: '+919876543210', aadhaarVerified: true,
  verificationStatus: 'approved', baseCity: 'Amritsar', vehicleType: 'sedan',
  createdAt: new Date(), isDeleted: false, deletedAt: null,
  subscription: { status: 'trial', expiresAt: null, trialExpiresAt: new Date('2026-07-01') },
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

test('list masks the phone and flattens subscription validUntil', async () => {
  const { repo } = fakeRepo();
  const svc = createAdminUsersService({ repo });
  const out = await svc.list({ page: 1, limit: 20, status: 'active' });
  assert.strictEqual(out.total, 1);
  const u = out.items[0];
  assert.strictEqual(u.phoneMasked, '••••3210');
  assert.strictEqual(u.phone, undefined);
  assert.strictEqual(u.subscription.status, 'trial');
  assert.deepStrictEqual(u.subscription.validUntil, new Date('2026-07-01'));
});

test('list returns null subscription when the user has none', async () => {
  const { repo } = fakeRepo({ async listUsers() { return { rows: [{ ...ROW, subscription: null }], total: 1 }; } });
  const svc = createAdminUsersService({ repo });
  const out = await svc.list({ page: 1, limit: 20, status: 'all' });
  assert.strictEqual(out.items[0].subscription, null);
});

test('setStatus(delete) flips the flag and returns the masked user', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminUsersService({ repo });
  const out = await svc.setStatus(USER_ID, { action: 'delete' });
  assert.deepStrictEqual(calls.setDeleted[0], [USER_ID, true]);
  assert.strictEqual(out.isDeleted, true);
  assert.strictEqual(out.phoneMasked, '••••3210');
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

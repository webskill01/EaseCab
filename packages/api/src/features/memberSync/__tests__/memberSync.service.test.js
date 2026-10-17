'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createMemberSyncService } = require('../memberSync.service');

const d = (s) => new Date(s);

function fakeRepo({ subs = [], pays = [] } = {}) {
  const calls = {};
  return {
    calls,
    async listSubscriptions(q) { calls.list = q; return subs; },
    async capturedPaymentsFor(ids) { return pays.filter((p) => ids.includes(p.userId)); },
    async capturedPaymentsBetween(from, to) {
      calls.between = [from, to];
      return pays.filter((p) => p.updatedAt >= from && p.updatedAt < to);
    },
    async firstPaymentTimes(ids) {
      return ids.map((userId) => ({
        userId,
        _min: { updatedAt: pays.filter((p) => p.userId === userId).map((p) => p.updatedAt).sort((a, b) => a - b)[0] },
      }));
    },
  };
}

test('listMemberships shapes each sub into a 10-digit phone with count and latest payment', async () => {
  const repo = fakeRepo({
    subs: [
      { userId: 'u1', status: 'active', expiresAt: d('2026-11-16T10:00:00Z'), user: { phone: '+919876543210' } },
      { userId: 'u2', status: 'expired', expiresAt: null, user: { phone: '+919123456789' } },
    ],
    pays: [
      { userId: 'u1', amount: 14900, updatedAt: d('2026-09-16T10:00:00Z') },
      { userId: 'u1', amount: 14900, updatedAt: d('2026-10-16T10:00:00Z') },
    ],
  });
  const out = await createMemberSyncService({ repo }).listMemberships({ phones: ['9876543210'] });
  assert.deepStrictEqual(repo.calls.list.phones, ['+919876543210'], 'phones go to the DB in stored +91 form');
  assert.strictEqual(out.truncated, false);
  assert.ok(!Number.isNaN(Date.parse(out.now)));
  assert.deepStrictEqual(out.members, [
    { phone: '9876543210', status: 'active', expiresAt: '2026-11-16T10:00:00.000Z', paidCount: 2, lastPaidAt: '2026-10-16T10:00:00.000Z', lastAmount: 149 },
    { phone: '9123456789', status: 'expired', expiresAt: null, paidCount: 0, lastPaidAt: null, lastAmount: null },
  ]);
});

test('listMemberships flags a page cut at MAX_ROWS', async () => {
  const { MEMBER_SYNC } = require('@easecab/shared');
  const subs = Array.from({ length: MEMBER_SYNC.MAX_ROWS + 1 }, (_, i) => (
    { userId: `u${i}`, status: 'active', expiresAt: null, user: { phone: '+919876543210' } }));
  const out = await createMemberSyncService({ repo: fakeRepo({ subs }) }).listMemberships();
  assert.strictEqual(out.truncated, true);
  assert.strictEqual(out.members.length, MEMBER_SYNC.MAX_ROWS);
});

test('listPayments marks a first-ever payment as a join and later ones as renewals', async () => {
  const pays = [
    { userId: 'u1', amount: 14900, updatedAt: d('2026-09-16T10:00:00Z'), user: { phone: '+919876543210' } },
    { userId: 'u1', amount: 14900, updatedAt: d('2026-10-16T10:00:00Z'), user: { phone: '+919876543210' } },
    { userId: 'u2', amount: 14900, updatedAt: d('2026-10-16T11:00:00Z'), user: { phone: '+919123456789' } },
  ];
  const out = await createMemberSyncService({ repo: fakeRepo({ pays }) })
    .listPayments({ from: d('2026-10-01T00:00:00Z'), to: d('2026-11-01T00:00:00Z') });
  assert.deepStrictEqual(out.payments, [
    { phone: '9876543210', amount: 149, paidAt: '2026-10-16T10:00:00.000Z', first: false },
    { phone: '9123456789', amount: 149, paidAt: '2026-10-16T11:00:00.000Z', first: true },
  ]);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createPresign } = require('../presign');
const { createAdminReferralsService } = require('../adminReferrals.service');

const r2 = { async presignGet({ key }) { if (key === 'bad') throw new Error('r2 down'); return `https://signed/${key}`; } };

test('presign: signs a key; null for no key, no r2, or an R2 error', async () => {
  assert.strictEqual(await createPresign(r2)('dp/1.jpg'), 'https://signed/dp/1.jpg');
  assert.strictEqual(await createPresign(r2)(null), null);
  assert.strictEqual(await createPresign(undefined)('dp/1.jpg'), null);
  assert.strictEqual(await createPresign(r2)('bad'), null);
});

test('presign: a stored public DP URL is returned untouched (not signed as a key)', async () => {
  assert.strictEqual(await createPresign(r2)('https://cdn.easecab.com/dp/1.jpg'), 'https://cdn.easecab.com/dp/1.jpg');
  assert.strictEqual(await createPresign(undefined)('https://cdn.easecab.com/dp/1.jpg'), 'https://cdn.easecab.com/dp/1.jpg');
});

test('referrals: referee + referrer carry a presigned avatarUrl', async () => {
  const row = { id: 'r1', name: 'A', phone: '+911', profilePicUrl: 'dp/a.jpg', createdAt: new Date(), referralRewardedAt: null,
    referredBy: { id: 'u1', name: 'B', phone: '+912', profilePicUrl: null }, _count: { payments: 0, paymentsOnBehalf: 0 } };
  const repo = { async list() { return { rows: [row], matched: 1, total: 1, paid: 0, rewarded: 0, referrers: 1 }; } };
  const { items } = await createAdminReferralsService({ repo, r2 }).list({ page: 1, limit: 20 });
  assert.strictEqual(items[0].referee.avatarUrl, 'https://signed/dp/a.jpg');
  assert.strictEqual(items[0].referrer.avatarUrl, null);
  assert.strictEqual('profilePicUrl' in items[0].referee, false);
});

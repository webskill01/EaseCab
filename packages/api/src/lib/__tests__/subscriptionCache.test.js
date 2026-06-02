'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { getCachedSub, setCachedSub, delCachedSub } = require('../subscriptionCache');

function fakeRedis() {
  const store = new Map();
  return {
    store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async set(k, v) { store.set(k, v); return 'OK'; },
    async del(k) { return store.delete(k) ? 1 : 0; },
  };
}

test('miss returns null; set then get round-trips and revives Date fields', async () => {
  const redis = fakeRedis();
  assert.strictEqual(await getCachedSub(redis, 'u1'), null);
  const exp = new Date('2026-07-01T00:00:00Z');
  await setCachedSub(redis, 'u1', { status: 'active', trialExpiresAt: null, expiresAt: exp });
  const hit = await getCachedSub(redis, 'u1');
  assert.strictEqual(hit.status, 'active');
  assert.ok(hit.expiresAt instanceof Date);
  assert.strictEqual(hit.expiresAt.getTime(), exp.getTime());
  assert.strictEqual(hit.trialExpiresAt, null);
});

test('del removes the key', async () => {
  const redis = fakeRedis();
  await setCachedSub(redis, 'u1', { status: 'trial', trialExpiresAt: new Date(), expiresAt: null });
  await delCachedSub(redis, 'u1');
  assert.strictEqual(await getCachedSub(redis, 'u1'), null);
});

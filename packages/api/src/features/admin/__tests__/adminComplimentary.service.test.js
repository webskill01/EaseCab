'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminComplimentaryService, extendBy } = require('../adminComplimentary.service');

const DAY = 86_400_000;
const now = new Date('2026-10-23T00:00:00Z');

function fakeRepo(user) {
  const calls = { grant: [], cache: [] };
  return {
    calls,
    async findUserByPhone() { return user; },
    async grant(a) { calls.grant.push(a); },
    async invalidateSubCache(id) { calls.cache.push(id); },
    async remove(id) { return id === 'u1'; },
  };
}

test('extendBy stacks months on time left, or starts from now', () => {
  const active = { status: 'active', expiresAt: new Date(now.getTime() + 10 * DAY) };
  assert.strictEqual(extendBy(active, 2, now).getTime(), now.getTime() + 70 * DAY);
  assert.strictEqual(extendBy(null, 1, now).getTime(), now.getTime() + 30 * DAY);
  assert.strictEqual(extendBy({ status: 'expired', expiresAt: new Date(now.getTime() - DAY) }, 1, now).getTime(), now.getTime() + 30 * DAY);
});

test('add grants months, drops the sub cache, masks the phone', async () => {
  const repo = fakeRepo({ id: 'u1', name: 'Shiv', subscription: null });
  const out = await createAdminComplimentaryService({ repo }).add({ phone: '+919999955552', months: 2, note: 'barter' }, 'a1');
  assert.strictEqual(repo.calls.grant[0].months, 2);
  assert.strictEqual(repo.calls.grant[0].adminId, 'a1');
  assert.ok(repo.calls.grant[0].expiresAt instanceof Date);
  assert.deepStrictEqual(repo.calls.cache, ['u1']);
  assert.strictEqual(out.phoneMasked, '••••5552');
});

test('add with 0 months only marks the user, plan untouched', async () => {
  const repo = fakeRepo({ id: 'u1', name: 'Shiv', subscription: null });
  await createAdminComplimentaryService({ repo }).add({ phone: '+919999955552', months: 0 }, 'a1');
  assert.strictEqual(repo.calls.grant[0].expiresAt, null);
  assert.deepStrictEqual(repo.calls.cache, []);
});

test('add rejects internal accounts and unknown numbers; remove 404s when not listed', async () => {
  const svc = createAdminComplimentaryService({ repo: fakeRepo(null) });
  await assert.rejects(svc.add({ phone: '+919876543210', months: 1 }, 'a1'), { statusCode: 422 });
  await assert.rejects(svc.add({ phone: '+919999955552', months: 1 }, 'a1'), { statusCode: 404 });
  await assert.rejects(svc.remove('nope'), { statusCode: 404 });
  await svc.remove('u1');
});

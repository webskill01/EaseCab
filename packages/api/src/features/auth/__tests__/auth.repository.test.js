'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAuthRepository } = require('../auth.repository');

function fakeRedis() {
  const store = new Map(); // key -> { value, ttl }
  return {
    calls: [],
    async ttl(key) { return store.has(key) ? store.get(key).ttl : -2; },
    // Models the FIXED_WINDOW_INCR script: INCR, set TTL only when absent.
    async eval(_script, _numKeys, key, windowSec) {
      const cur = store.get(key) || { value: 0, ttl: -1 };
      cur.value += 1;
      if (cur.ttl < 0) cur.ttl = Number(windowSec);
      store.set(key, cur);
      return cur.value;
    },
    async set(key, value, mode, secs) { store.set(key, { value, ttl: secs }); return 'OK'; },
    _store: store,
  };
}

test('OTP keys are namespaced under easecab: and gate logic is correct', async () => {
  const redis = fakeRedis();
  const repo = createAuthRepository({ prisma: {}, redis });

  assert.strictEqual(await repo.getResendCooldownTtl('+919876543210'), -2); // none yet
  assert.strictEqual(await repo.incrementOtpCount('+919876543210', 3600), 1);
  assert.strictEqual(await repo.incrementOtpCount('+919876543210', 3600), 2);
  await repo.setResendCooldown('+919876543210', 30);
  assert.strictEqual(await repo.getResendCooldownTtl('+919876543210'), 30);

  assert.ok([...redis._store.keys()].every((k) => k.startsWith('easecab:otp:')));
});

test('incrementOtpCount uses a FIXED window (TTL set once, self-heals a lost TTL)', async () => {
  const redis = fakeRedis();
  const repo = createAuthRepository({ prisma: {}, redis });
  await repo.incrementOtpCount('+919000000000', 3600);
  const key = 'easecab:otp:count:+919000000000';
  assert.strictEqual(redis._store.get(key).ttl, 3600);
  // A normal second hit increments but must NOT push the window forward (fixed window).
  redis._store.get(key).ttl = 1800; // pretend time elapsed
  await repo.incrementOtpCount('+919000000000', 3600);
  assert.strictEqual(redis._store.get(key).ttl, 1800); // unchanged — not slidable
  // But a key left WITHOUT a TTL (old-crash orphan) self-heals on the next hit.
  redis._store.get(key).ttl = -1;
  await repo.incrementOtpCount('+919000000000', 3600);
  assert.strictEqual(redis._store.get(key).ttl, 3600); // re-applied
});

test('createUserWithTrial nests a trial subscription; findUserByPhone has no isDeleted filter', async () => {
  const created = [];
  const prisma = {
    user: {
      findUnique: async ({ where }) => (where.phone === '+91hit' ? { id: 'u1', phone: '+91hit', isDeleted: false } : null),
      findFirst: async ({ where }) => (where.id === 'u1' && where.isDeleted === false ? { id: 'u1' } : null),
      create: async (args) => { created.push(args); return { id: 'new', ...args.data }; },
      update: async ({ where, data }) => ({ id: where.id, ...data }),
    },
  };
  const repo = createAuthRepository({ prisma, redis: fakeRedis() });

  assert.deepStrictEqual(await repo.findUserByPhone('+91hit'), { id: 'u1', phone: '+91hit', isDeleted: false });
  assert.strictEqual(await repo.findUserByPhone('+91miss'), null);

  const trialEnds = new Date('2026-06-08T00:00:00Z');
  await repo.createUserWithTrial('+91new', trialEnds);
  assert.strictEqual(created[0].data.phone, '+91new');
  assert.strictEqual(created[0].data.subscription.create.trialExpiresAt, trialEnds);
  assert.deepStrictEqual(created[0].include, { subscription: true });

  assert.deepStrictEqual(await repo.findActiveUserById('u1'), { id: 'u1' });
});

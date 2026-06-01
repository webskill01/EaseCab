// packages/api/src/lib/__tests__/rateLimit.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { fixedWindowIncr } = require('../rateLimit');

/** A redis double whose `eval` models the FIXED_WINDOW_INCR script's semantics. */
function fakeRedis() {
  const store = new Map(); // key -> { value, ttl }
  return {
    _store: store,
    async eval(_script, _numKeys, key, windowSec) {
      const cur = store.get(key) || { value: 0, ttl: -1 };
      cur.value += 1;
      if (cur.ttl < 0) cur.ttl = Number(windowSec); // set TTL only when absent (fixed window)
      store.set(key, cur);
      return cur.value;
    },
  };
}

test('first hit sets the window TTL; subsequent hits increment without resetting it', async () => {
  const redis = fakeRedis();
  assert.strictEqual(await fixedWindowIncr(redis, 'k', 60), 1);
  assert.strictEqual(redis._store.get('k').ttl, 60);
  assert.strictEqual(await fixedWindowIncr(redis, 'k', 60), 2);
  assert.strictEqual(redis._store.get('k').ttl, 60); // NOT pushed forward — fixed window
});

test('a key left without a TTL (old-crash orphan) self-heals on the next hit', async () => {
  const redis = fakeRedis();
  await fixedWindowIncr(redis, 'k', 60);
  redis._store.get('k').ttl = -1; // simulate a lost expiry
  await fixedWindowIncr(redis, 'k', 60);
  assert.strictEqual(redis._store.get('k').ttl, 60); // re-applied
});

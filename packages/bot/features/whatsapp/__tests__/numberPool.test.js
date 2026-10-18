'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { BACKOFF, BOT_HEALTH } = require('@easecab/shared');
const { createNumberPool } = require('../numberPool');

const LOGGED_OUT = 401;
const TIMEOUT = 408;

/** Pool over the given slots; returns the pool + a log of connect calls (each holds its onClose). */
function makePool(slots) {
  const connects = [];
  const pool = createNumberPool({
    slots,
    groups: {},
    onMessage: async () => {},
    logger: { info() {}, warn() {}, error() {} },
    redis: { hset: async () => {} },
    alerter: { raise() {}, clear() {} },
    registry: { sessionDirFor: (s) => s, eligibleSlots: () => slots },
    connectionFactory: async (opts) => {
      connects.push(opts);
      return { end() {} };
    },
    loggedOutCode: LOGGED_OUT,
  });
  return { pool, connects };
}

/** Let the awaited connectionFactory resolve. */
const flush = () => new Promise((r) => setImmediate(r));

test.afterEach(() => mock.timers.reset());

/** Drive one slot through MAX_ATTEMPTS consecutive closes with `code`. */
async function exhaust(connects, code) {
  for (let i = 0; i < BACKOFF.MAX_ATTEMPTS; i += 1) {
    await flush();
    connects.at(-1).onClose(code);
    if (i < BACKOFF.MAX_ATTEMPTS - 1) mock.timers.tick(BACKOFF.MAX_MS); // fire the backoff reconnect
  }
}

test('a degraded-only pool retries the slot on rescan instead of staying dark', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { pool, connects } = makePool(['slot-1']);
  pool.start();
  await exhaust(connects, TIMEOUT);
  const before = connects.length;

  mock.timers.tick(BOT_HEALTH.RESCAN_MS);
  await flush();

  assert.equal(connects.length, before + 1);
  pool.stop();
});

test('a banned slot is never retried by the rescan', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { pool, connects } = makePool(['slot-1']);
  pool.start();
  await flush();
  connects.at(-1).onClose(LOGGED_OUT);
  const before = connects.length;

  mock.timers.tick(BOT_HEALTH.RESCAN_MS * 3);
  await flush();

  assert.equal(connects.length, before);
  pool.stop();
});

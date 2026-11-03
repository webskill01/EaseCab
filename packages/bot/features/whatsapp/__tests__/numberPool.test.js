'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { BACKOFF, BOT_HEALTH, ALERT_EVENT } = require('@easecab/shared');
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
    registry: { sessionDirFor: (s) => s, eligibleSlots: () => slots, listedSlots: () => slots },
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

/** Pool that records alerts and forwarded messages. */
function makeObservedPool(slots) {
  const raised = [];
  const seen = [];
  const connects = [];
  const pool = createNumberPool({
    slots,
    groups: {},
    onMessage: async (m) => { seen.push(m); },
    logger: { info() {}, warn() {}, error() {} },
    redis: { hset: async () => {} },
    alerter: { raise: (e, sev, d) => raised.push({ e, d }), clear() {} },
    registry: { sessionDirFor: (s) => s, eligibleSlots: () => slots, listedSlots: () => slots },
    connectionFactory: async (opts) => {
      connects.push(opts);
      return { end() {} };
    },
    loggedOutCode: LOGGED_OUT,
  });
  return { pool, connects, raised, seen };
}

test('every paired slot connects at once', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { pool, connects } = makeObservedPool(['slot-1', 'slot-2', 'slot-3']);
  pool.start();
  await flush();
  assert.deepEqual(connects.map((c) => c.sessionPath), ['slot-1', 'slot-2', 'slot-3']);
  pool.stop();
});

test('one banned slot leaves the others running and the feed is not dark', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { pool, connects, raised } = makeObservedPool(['slot-1', 'slot-2']);
  pool.start();
  await flush();
  connects[1].onOpen();
  connects[0].onClose(LOGGED_OUT);

  assert.deepEqual(raised.map((r) => r.e), [`${ALERT_EVENT.NUMBER_BANNED}:slot-1`]);
  mock.timers.tick(BOT_HEALTH.RESCAN_MS * 2);
  await flush();
  assert.equal(connects.length, 2); // banned slot not retried, live one untouched
  pool.stop();
});

test('ALL_EXHAUSTED fires only once every slot is down', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { pool, connects, raised } = makeObservedPool(['slot-1', 'slot-2']);
  pool.start();
  await flush();
  connects[0].onClose(LOGGED_OUT);
  assert.equal(raised.some((r) => r.e === ALERT_EVENT.ALL_EXHAUSTED), false);
  connects[1].onClose(LOGGED_OUT);
  assert.equal(raised.filter((r) => r.e === ALERT_EVENT.ALL_EXHAUSTED).length, 1);
  pool.stop();
});

test('messages are tagged with the slot that received them', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { pool, connects, seen } = makeObservedPool(['slot-1', 'slot-2']);
  pool.start();
  await flush();
  await connects[1].onMessage({ text: 'x', msgId: 'm1' });
  assert.deepEqual(seen, [{ text: 'x', msgId: 'm1', botId: 'slot-2' }]);
  pool.stop();
});

test('each number gets its own alert, so a second ban still notifies', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { pool, connects, raised } = makeObservedPool(['slot-1', 'slot-2', 'slot-3']);
  pool.start();
  await flush();
  connects[0].onClose(LOGGED_OUT);
  connects[1].onClose(LOGGED_OUT);
  assert.deepEqual(raised.map((r) => r.e), [
    `${ALERT_EVENT.NUMBER_BANNED}:slot-1`,
    `${ALERT_EVENT.NUMBER_BANNED}:slot-2`,
  ]);
  pool.stop();
});

test('a slot dropped from the list (paused/removed) is stopped on rescan; busy slots wait', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const slots = ['slot-1', 'slot-2'];
  const ended = [];
  const busy = new Set(['slot-2']);
  const pool = createNumberPool({
    groups: {},
    onMessage: async () => {},
    logger: { info() {}, warn() {}, error() {} },
    redis: { hset: async () => {} },
    alerter: { raise() {}, clear() {} },
    registry: { sessionDirFor: (s) => s, eligibleSlots: () => slots, listedSlots: () => slots },
    connectionFactory: async (opts) => ({ end: () => ended.push(opts.sessionPath) }),
    loggedOutCode: LOGGED_OUT,
    busy,
  });
  pool.start();
  await flush();
  assert.deepEqual(ended, []);

  slots.splice(0, 1); // slot-1 paused
  busy.clear(); // pairing of slot-2 finished
  pool.rescan();
  await flush();
  assert.deepEqual(ended, ['slot-1']);
  pool.stop();
});

test('the linked number is reported on open', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const phones = [];
  let opts;
  const pool = createNumberPool({
    groups: {},
    onMessage: async () => {},
    logger: { info() {}, warn() {}, error() {} },
    redis: { hset: async () => {} },
    alerter: { raise() {}, clear() {} },
    registry: { sessionDirFor: (s) => s, eligibleSlots: () => ['wa-1'], listedSlots: () => ['wa-1'] },
    connectionFactory: async (o) => {
      opts = o;
      return { end() {}, user: { id: '919876543210:7@s.whatsapp.net' } };
    },
    loggedOutCode: LOGGED_OUT,
    onPhone: (slot, phone) => phones.push([slot, phone]),
  });
  pool.start();
  await flush();
  opts.onOpen();
  assert.deepEqual(phones, [['wa-1', '919876543210']]);
  pool.stop();
});

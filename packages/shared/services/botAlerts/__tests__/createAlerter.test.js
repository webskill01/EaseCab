'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createAlerter } = require('../createAlerter');
const { ALERT_EVENT, ALERT_SEV, BOT_ALERTS_KEY } = require('../../../constants/bot');

/** Minimal fake ioredis capturing hset/hdel calls; optionally throws. */
function fakeRedis({ throwOn } = {}) {
  const calls = [];
  const mk = (name) => async (...args) => {
    calls.push({ name, args });
    if (throwOn === name) throw new Error(`${name} boom`);
  };
  return { calls, hset: mk('hset'), hdel: mk('hdel') };
}

/** Logger capturing leveled calls. */
function fakeLogger() {
  const lines = { info: [], warn: [], error: [] };
  return {
    lines,
    info: (...a) => lines.info.push(a),
    warn: (...a) => lines.warn.push(a),
    error: (...a) => lines.error.push(a),
  };
}

test('raise persists alert state to the easecab:bot:alerts hash', async () => {
  const redis = fakeRedis();
  const logger = fakeLogger();
  const alerter = createAlerter({ redis, logger });

  await alerter.raise(ALERT_EVENT.FAILOVER, ALERT_SEV.WARN, { slot: 'slot-1' });

  const hset = redis.calls.find((c) => c.name === 'hset');
  assert.ok(hset, 'hset called');
  assert.equal(hset.args[0], BOT_ALERTS_KEY);
  assert.equal(hset.args[1], ALERT_EVENT.FAILOVER);
  const stored = JSON.parse(hset.args[2]);
  assert.equal(stored.sev, ALERT_SEV.WARN);
  assert.deepEqual(stored.detail, { slot: 'slot-1' });
  assert.equal(typeof stored.since, 'number');
});

test('raise logs at error for SEV1, warn otherwise', async () => {
  const logger = fakeLogger();
  const alerter = createAlerter({ redis: fakeRedis(), logger });

  await alerter.raise(ALERT_EVENT.ALL_EXHAUSTED, ALERT_SEV.SEV1);
  await alerter.raise(ALERT_EVENT.FEED_STALE, ALERT_SEV.WARN);

  assert.equal(logger.lines.error.length, 1);
  assert.equal(logger.lines.warn.length, 1);
});

test('clear removes the alert field and logs info', async () => {
  const redis = fakeRedis();
  const logger = fakeLogger();
  const alerter = createAlerter({ redis, logger });

  await alerter.clear(ALERT_EVENT.FEED_STALE);

  const hdel = redis.calls.find((c) => c.name === 'hdel');
  assert.ok(hdel);
  assert.equal(hdel.args[0], BOT_ALERTS_KEY);
  assert.equal(hdel.args[1], ALERT_EVENT.FEED_STALE);
  assert.equal(logger.lines.info.length, 1);
});

test('redis failures are swallowed — alerting never throws', async () => {
  const logger = fakeLogger();
  const raiser = createAlerter({ redis: fakeRedis({ throwOn: 'hset' }), logger });
  const clearer = createAlerter({ redis: fakeRedis({ throwOn: 'hdel' }), logger });

  await assert.doesNotReject(() => raiser.raise(ALERT_EVENT.NUMBER_BANNED, ALERT_SEV.WARN));
  await assert.doesNotReject(() => clearer.clear(ALERT_EVENT.NUMBER_BANNED));
  // the persist failure was logged at error
  assert.ok(logger.lines.error.length >= 2);
});

test('a missing logger does not break raise/clear (incl. redis failure path)', async () => {
  const ok = createAlerter({ redis: fakeRedis() });
  await assert.doesNotReject(() => ok.raise(ALERT_EVENT.FAILOVER, ALERT_SEV.WARN));
  await assert.doesNotReject(() => ok.clear(ALERT_EVENT.FAILOVER));

  // redis throwing with the default no-op logger must still not reject
  const failing = createAlerter({ redis: fakeRedis({ throwOn: 'hset' }) });
  await assert.doesNotReject(() => failing.raise(ALERT_EVENT.NUMBER_BANNED, ALERT_SEV.SEV1));
});

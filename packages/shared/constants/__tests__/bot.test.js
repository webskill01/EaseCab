'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  SLOT_STATE,
  ALERT_EVENT,
  ALERT_SEV,
  BOT_HEALTH,
  BACKOFF,
  BOT_NUMBERS_KEY,
  BOT_LAST_INGEST_KEY,
  BOT_ALERTS_KEY,
} = require('../index');

test('bot value sets are frozen (CLAUDE.md §5)', () => {
  for (const obj of [SLOT_STATE, ALERT_EVENT, ALERT_SEV, BOT_HEALTH, BACKOFF]) {
    assert.ok(Object.isFrozen(obj));
  }
  assert.throws(() => {
    'use strict';
    SLOT_STATE.ACTIVE = 'hacked';
  }, TypeError);
});

test('SLOT_STATE / ALERT_EVENT / ALERT_SEV carry the expected members', () => {
  assert.deepEqual(Object.values(SLOT_STATE).sort(), ['active', 'banned', 'degraded', 'unregistered']);
  assert.deepEqual(
    Object.values(ALERT_EVENT).sort(),
    ['all_exhausted', 'failover', 'feed_stale', 'number_banned'],
  );
  assert.deepEqual(Object.values(ALERT_SEV).sort(), ['info', 'sev1', 'warn']);
});

test('health + backoff defaults are sane positive numbers', () => {
  assert.equal(BOT_HEALTH.STALE_AFTER_MIN, 20);
  assert.ok(BOT_HEALTH.ACTIVE_HOUR_START_IST < BOT_HEALTH.ACTIVE_HOUR_END_IST);
  assert.ok(BACKOFF.BASE_MS > 0 && BACKOFF.MAX_MS >= BACKOFF.BASE_MS);
  assert.ok(Number.isInteger(BACKOFF.MAX_ATTEMPTS) && BACKOFF.MAX_ATTEMPTS > 0);
});

test('redis keys are namespaced under easecab:bot:', () => {
  assert.equal(BOT_NUMBERS_KEY, 'easecab:bot:numbers');
  assert.equal(BOT_LAST_INGEST_KEY, 'easecab:bot:last_ingest_at');
  assert.equal(BOT_ALERTS_KEY, 'easecab:bot:alerts');
});

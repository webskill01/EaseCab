'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEnv } = require('../env.schema');

test('accepts a valid pooled DATABASE_URL + REDIS_URL and freezes the result', () => {
  const result = parseEnv({
    DATABASE_URL: 'postgresql://u:p@host:6543/db?pgbouncer=true',
    REDIS_URL: 'redis://127.0.0.1:6379',
  });
  assert.equal(result.success, true);
  assert.equal(result.data.DATABASE_URL, 'postgresql://u:p@host:6543/db?pgbouncer=true');
  assert.ok(Object.isFrozen(result.data));
});

test('rejects a missing DATABASE_URL, naming the variable (no values leaked)', () => {
  const result = parseEnv({});
  assert.equal(result.success, false);
  assert.ok(result.errors.some((e) => e.startsWith('DATABASE_URL')));
});

test('rejects a non-URL DATABASE_URL', () => {
  const result = parseEnv({ DATABASE_URL: 'not-a-url' });
  assert.equal(result.success, false);
  assert.ok(result.errors.some((e) => e.startsWith('DATABASE_URL')));
});

const BASE = Object.freeze({
  DATABASE_URL: 'postgresql://u:p@host:6543/db?pgbouncer=true',
  REDIS_URL: 'redis://127.0.0.1:6379',
});

test('requires REDIS_URL (cron stale watcher reads the bot heartbeat)', () => {
  const result = parseEnv({ DATABASE_URL: BASE.DATABASE_URL });
  assert.equal(result.success, false);
  assert.ok(result.errors.some((e) => e.startsWith('REDIS_URL')));
});

test('applies bot-health defaults when omitted', () => {
  const r = parseEnv(BASE);
  assert.equal(r.success, true);
  assert.equal(r.data.BOT_FEED_ENABLED, true);
  assert.equal(r.data.STALE_AFTER_MIN, 20);
  assert.equal(r.data.ACTIVE_HOUR_START_IST, 6);
  assert.equal(r.data.ACTIVE_HOUR_END_IST, 23);
});

test('coerces STALE_AFTER_MIN and BOT_FEED_ENABLED from strings', () => {
  const r = parseEnv({ ...BASE, STALE_AFTER_MIN: '30', BOT_FEED_ENABLED: 'false' });
  assert.equal(r.success, true);
  assert.equal(r.data.STALE_AFTER_MIN, 30);
  assert.equal(r.data.BOT_FEED_ENABLED, false);
});

test('rejects a non-positive STALE_AFTER_MIN, naming it', () => {
  const r = parseEnv({ ...BASE, STALE_AFTER_MIN: '0' });
  assert.equal(r.success, false);
  assert.ok(r.errors.some((e) => e.startsWith('STALE_AFTER_MIN')));
});

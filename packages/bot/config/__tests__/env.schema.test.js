'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { parseEnv } = require('../env.schema');

const BASE = Object.freeze({
  DATABASE_URL: 'postgresql://u:p@host:6543/db',
  REDIS_URL: 'redis://127.0.0.1:6379',
  WA_TARGET_GROUP_JID: '120363000000000000@g.us',
  WA_SESSION_PATH: './.wa-session',
});

test('parseEnv accepts a fully valid env and freezes the result', () => {
  const r = parseEnv(BASE);
  assert.strictEqual(r.success, true);
  assert.ok(Object.isFrozen(r.data));
  assert.strictEqual(r.data.WA_TARGET_GROUP_JID, BASE.WA_TARGET_GROUP_JID);
});

test('parseEnv defaults WA_SESSION_PATH when omitted', () => {
  const { WA_SESSION_PATH, ...withoutPath } = BASE;
  const r = parseEnv(withoutPath);
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.WA_SESSION_PATH, './.wa-session');
});

test('parseEnv reports DATABASE_URL by name on a bad url', () => {
  const r = parseEnv({ ...BASE, DATABASE_URL: 'not-a-url' });
  assert.strictEqual(r.success, false);
  assert.match(r.errors[0], /DATABASE_URL/);
});

test('parseEnv reports REDIS_URL by name on a bad url', () => {
  const r = parseEnv({ ...BASE, REDIS_URL: 'not-a-url' });
  assert.strictEqual(r.success, false);
  assert.match(r.errors[0], /REDIS_URL/);
});

test('parseEnv rejects an empty WA_TARGET_GROUP_JID and names it', () => {
  const r = parseEnv({ ...BASE, WA_TARGET_GROUP_JID: '' });
  assert.strictEqual(r.success, false);
  assert.match(r.errors[0], /WA_TARGET_GROUP_JID/);
});

test('parseEnv names WA_TARGET_GROUP_JID when missing', () => {
  const { WA_TARGET_GROUP_JID, ...withoutJid } = BASE;
  const r = parseEnv(withoutJid);
  assert.strictEqual(r.success, false);
  assert.ok(r.errors.some((line) => /WA_TARGET_GROUP_JID/.test(line)));
});

test('parseEnv labels a root-level issue as (root)', () => {
  // A non-object input yields a Zod issue with an empty path, exercising the
  // `|| '(root)'` fallback in the error mapper.
  const r = parseEnv(null);
  assert.strictEqual(r.success, false);
  assert.match(r.errors[0], /^\(root\):/);
});

test('WA_NUMBERS defaults to a single slot-1 pool', () => {
  const r = parseEnv(BASE);
  assert.strictEqual(r.success, true);
  assert.deepStrictEqual(r.data.WA_NUMBERS, ['slot-1']);
});

test('WA_NUMBERS splits, trims, and drops empties', () => {
  const r = parseEnv({ ...BASE, WA_NUMBERS: 'slot-1, slot-2 ,slot-3,' });
  assert.strictEqual(r.success, true);
  assert.deepStrictEqual(r.data.WA_NUMBERS, ['slot-1', 'slot-2', 'slot-3']);
});

test('WA_NUMBERS rejects an all-empty list and names it', () => {
  const r = parseEnv({ ...BASE, WA_NUMBERS: ' , ,' });
  assert.strictEqual(r.success, false);
  assert.ok(r.errors.some((line) => /WA_NUMBERS/.test(line)));
});

test('BOT_FEED_ENABLED defaults to true and coerces the enum to boolean', () => {
  assert.strictEqual(parseEnv(BASE).data.BOT_FEED_ENABLED, true);
  assert.strictEqual(parseEnv({ ...BASE, BOT_FEED_ENABLED: 'false' }).data.BOT_FEED_ENABLED, false);
  assert.strictEqual(parseEnv({ ...BASE, BOT_FEED_ENABLED: 'true' }).data.BOT_FEED_ENABLED, true);
});

test('BOT_FEED_ENABLED rejects a non true/false value and names it', () => {
  const r = parseEnv({ ...BASE, BOT_FEED_ENABLED: 'yes' });
  assert.strictEqual(r.success, false);
  assert.ok(r.errors.some((line) => /BOT_FEED_ENABLED/.test(line)));
});

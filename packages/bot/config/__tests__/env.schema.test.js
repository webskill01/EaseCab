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

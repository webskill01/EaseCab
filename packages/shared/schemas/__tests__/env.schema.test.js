'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { parseEnv } = require('../env.schema');

const GOOD = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@host:6543/db?pgbouncer=true',
  DIRECT_URL: 'postgresql://u:p@host:5432/db',
  REDIS_URL: 'redis://127.0.0.1:6379',
};

test('parseEnv accepts a valid environment', () => {
  const result = parseEnv(GOOD);
  assert.equal(result.success, true);
  assert.equal(result.data.NODE_ENV, 'production');
  assert.equal(result.data.REDIS_URL, 'redis://127.0.0.1:6379');
});

test('parseEnv defaults NODE_ENV to development when absent', () => {
  const { NODE_ENV, ...noNodeEnv } = GOOD;
  const result = parseEnv(noNodeEnv);
  assert.equal(result.success, true);
  assert.equal(result.data.NODE_ENV, 'development');
});

test('parseEnv returns a frozen data object', () => {
  const result = parseEnv(GOOD);
  assert.ok(Object.isFrozen(result.data));
});

test('parseEnv fails when DATABASE_URL is missing and names the var', () => {
  const { DATABASE_URL, ...missing } = GOOD;
  const result = parseEnv(missing);
  assert.equal(result.success, false);
  assert.ok(result.errors.some((e) => e.includes('DATABASE_URL')));
});

test('parseEnv rejects a malformed URL', () => {
  const result = parseEnv({ ...GOOD, REDIS_URL: 'not-a-url' });
  assert.equal(result.success, false);
  assert.ok(result.errors.some((e) => e.includes('REDIS_URL')));
});

test('parseEnv rejects an invalid NODE_ENV', () => {
  const result = parseEnv({ ...GOOD, NODE_ENV: 'staging' });
  assert.equal(result.success, false);
});

// §3 non-negotiable: the loader exits the process immediately on bad env.
test('config/env exits non-zero when env is invalid', () => {
  const loader = path.join(__dirname, '..', '..', 'config', 'env.js');
  const run = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(loader)})`], {
    env: { PATH: process.env.PATH }, // deliberately missing all required vars
    encoding: 'utf8',
  });
  assert.notEqual(run.status, 0);
});

test('config/env loads cleanly with a valid env', () => {
  const loader = path.join(__dirname, '..', '..', 'config', 'env.js');
  const run = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(loader)})`], {
    env: { ...GOOD, PATH: process.env.PATH },
    encoding: 'utf8',
  });
  assert.equal(run.status, 0);
});

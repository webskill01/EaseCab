'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEnv } = require('../env.schema');

test('accepts a valid pooled DATABASE_URL and freezes the result', () => {
  const result = parseEnv({ DATABASE_URL: 'postgresql://u:p@host:6543/db?pgbouncer=true' });
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

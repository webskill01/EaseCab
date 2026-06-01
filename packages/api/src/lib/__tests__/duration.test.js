'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { durationToMs } = require('../duration');

test('parses s/m/h/d units', () => {
  assert.strictEqual(durationToMs('30s'), 30_000);
  assert.strictEqual(durationToMs('15m'), 900_000);
  assert.strictEqual(durationToMs('2h'), 7_200_000);
  assert.strictEqual(durationToMs('30d'), 2_592_000_000);
});

test('throws on garbage', () => {
  assert.throws(() => durationToMs('15'));
  assert.throws(() => durationToMs('5y'));
  assert.throws(() => durationToMs(''));
});

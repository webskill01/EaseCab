'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { nextDelayMs } = require('../backoff');
const { BACKOFF } = require('@easecab/shared');

test('exponential schedule: BASE * 2^(attempt-1)', () => {
  assert.equal(nextDelayMs(1), BACKOFF.BASE_MS); // 1000
  assert.equal(nextDelayMs(2), BACKOFF.BASE_MS * 2); // 2000
  assert.equal(nextDelayMs(3), BACKOFF.BASE_MS * 4); // 4000
  assert.equal(nextDelayMs(5), BACKOFF.BASE_MS * 16); // 16000
});

test('caps at BACKOFF.MAX_MS for large attempts', () => {
  assert.equal(nextDelayMs(100), BACKOFF.MAX_MS);
  assert.ok(nextDelayMs(20) <= BACKOFF.MAX_MS);
});

test('rejects attempts below 1', () => {
  assert.throws(() => nextDelayMs(0), /attempt/);
  assert.throws(() => nextDelayMs(-3), /attempt/);
});

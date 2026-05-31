'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { fingerprint } = require('../fingerprint');

test('same text → same fingerprint regardless of time', () => {
  const a = fingerprint('Delhi to Chandigarh 9876543210');
  const b = fingerprint('Delhi to Chandigarh 9876543210');
  assert.strictEqual(a, b);
});

test('phone digits are masked so different phones on same route still differ in text only', () => {
  // phone run replaced by PHONE → identical route+text yields identical fp
  const a = fingerprint('Delhi to Chandigarh 9876543210');
  const b = fingerprint('Delhi to Chandigarh 9999999999');
  assert.strictEqual(a, b);
});

test('different route → different fingerprint', () => {
  assert.notStrictEqual(
    fingerprint('Delhi to Chandigarh 9876543210'),
    fingerprint('Delhi to Amritsar 9876543210'),
  );
});

test('empty text → empty string', () => {
  assert.strictEqual(fingerprint(''), '');
});

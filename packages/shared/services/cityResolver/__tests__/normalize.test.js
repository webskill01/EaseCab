'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCityText } = require('../normalize');

test('lowercases, trims, and collapses whitespace', () => {
  assert.equal(normalizeCityText('  Delhi   To    GGN '), 'delhi to ggn');
});

test('strips WhatsApp formatting symbols', () => {
  assert.equal(normalizeCityText('*Delhi* _to_ ~ggn~ `cp`'), 'delhi to ggn cp');
});

test('strips emoji and pictographs', () => {
  assert.equal(normalizeCityText('🚖 delhi ➡️ mohali ✅'), 'delhi mohali');
});

test('returns empty string for non-string or empty input', () => {
  assert.equal(normalizeCityText(''), '');
  assert.equal(normalizeCityText(null), '');
  assert.equal(normalizeCityText(undefined), '');
  assert.equal(normalizeCityText(12345), '');
});

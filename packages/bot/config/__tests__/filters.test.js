'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { FILTERS } = require('../filters');

test('exposes four de-duped, lowercased list fields', () => {
  for (const key of ['rideKeywords', 'ignoreKeywords', 'blockedPhoneNumbers', 'blockedSenders']) {
    assert.ok(Array.isArray(FILTERS[key]) && FILTERS[key].length > 0, key);
  }
  const kw = FILTERS.rideKeywords;
  assert.strictEqual(new Set(kw).size, kw.length, 'rideKeywords deduped');
  assert.ok(kw.every((k) => k === k.toLowerCase()), 'rideKeywords lowercased');
  const ig = FILTERS.ignoreKeywords;
  assert.strictEqual(new Set(ig).size, ig.length, 'ignoreKeywords deduped');
  assert.ok(ig.every((k) => k === k.toLowerCase()), 'ignoreKeywords lowercased');
});

test('blocked numbers are 10-digit normalized and de-duped', () => {
  assert.ok(FILTERS.blockedPhoneNumbers.every((n) => /^\d{10}$/.test(n)));
  assert.strictEqual(new Set(FILTERS.blockedPhoneNumbers).size, FILTERS.blockedPhoneNumbers.length);
  assert.ok(FILTERS.blockedSenders.every((n) => /^\d{10}$/.test(n)));
});

// Locked decision (2026-05-31, see DECISIONS.md): free/khali = HARD IGNORE (strict).
test('honors strict free/khali ignore decision (incl. Gurmukhi/Devanagari)', () => {
  for (const word of ['free', 'khali', 'ਖਾਲੀ', 'खाली']) {
    assert.ok(FILTERS.ignoreKeywords.includes(word), `ignoreKeywords must contain ${word}`);
  }
});

test('FILTERS is frozen', () => {
  assert.ok(Object.isFrozen(FILTERS));
});

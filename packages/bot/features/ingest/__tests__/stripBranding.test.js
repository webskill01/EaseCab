'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { KNOWN_BRANDINGS } = require('@easecab/shared');
const { stripBranding } = require('../stripBranding');
const { fingerprint } = require('../fingerprint');

const RIDE = 'Need Innova Ludhiana to Delhi 9876543210';

test('strips a trailing fleet stamp and the whitespace before it', () => {
  assert.strictEqual(stripBranding(`${RIDE}\n\n- 🚨 Forwarded Duty 🚨`), RIDE);
});

test('peels stacked stamps from several hops', () => {
  assert.strictEqual(stripBranding(`${RIDE}\n- 🚕 Duty Forwarded 🚕\n- 📍 Forwarded ਡਿਊਟੀ 📍  `), RIDE);
});

test('leaves a stamp that is not at the end, and unstamped text, untouched', () => {
  const mid = `- 🚨 Forwarded Duty 🚨\n${RIDE}`;
  assert.strictEqual(stripBranding(mid), mid);
  assert.strictEqual(stripBranding(RIDE), RIDE);
});

test('the same ride forwarded by two bots fingerprints identically', () => {
  const a = stripBranding(`${RIDE}\n- 🚗 Forwarded Duty 🚗`);
  const b = stripBranding(`${RIDE}\n- 🔔 Duty Forwarded 🔔`);
  assert.strictEqual(fingerprint(a), fingerprint(b));
});

test('every known branding is stripped', () => {
  for (const v of KNOWN_BRANDINGS) assert.strictEqual(stripBranding(`${RIDE}\n${v}`), RIDE, v);
});

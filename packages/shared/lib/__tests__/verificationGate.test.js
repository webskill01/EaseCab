'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { hasSubmittedKyc } = require('../verificationGate');

test('hasSubmittedKyc: true when any per-doc flag is set', () => {
  assert.equal(hasSubmittedKyc({ aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false }), true);
  assert.equal(hasSubmittedKyc({ aadhaarVerified: false, dlSubmitted: true, rcSubmitted: false }), true);
  assert.equal(hasSubmittedKyc({ aadhaarVerified: false, dlSubmitted: false, rcSubmitted: true }), true);
});

test('hasSubmittedKyc: false when no flag is set, null, or undefined', () => {
  assert.equal(hasSubmittedKyc({ aadhaarVerified: false, dlSubmitted: false, rcSubmitted: false }), false);
  assert.equal(hasSubmittedKyc(null), false);
  assert.equal(hasSubmittedKyc(undefined), false);
});

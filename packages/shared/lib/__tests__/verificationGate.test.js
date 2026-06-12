'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { isProfileComplete, hasSubmittedKyc } = require('../verificationGate');

const full = {
  name: 'Gurpreet', bio: 'Punjab driver, 8 yrs', baseCity: 'Ludhiana',
  vehicleType: 'Innova', profilePicUrl: 'https://r2/dp/u/x.jpg',
  languagesSpoken: ['pa', 'hi'], aadhaarVerified: true,
};

test('isProfileComplete: true only when every required field is present', () => {
  assert.strictEqual(isProfileComplete(full), true);
  assert.strictEqual(isProfileComplete(null), false);
  assert.strictEqual(isProfileComplete({ ...full, bio: '   ' }), false);
  assert.strictEqual(isProfileComplete({ ...full, profilePicUrl: null }), false);
  assert.strictEqual(isProfileComplete({ ...full, languagesSpoken: [] }), false);
});

test('hasSubmittedKyc: L1 = aadhaarVerified AND profileComplete', () => {
  assert.strictEqual(hasSubmittedKyc(full), true);
  assert.strictEqual(hasSubmittedKyc({ ...full, aadhaarVerified: false }), false);
  assert.strictEqual(hasSubmittedKyc({ ...full, name: '' }), false);
  assert.strictEqual(hasSubmittedKyc(null), false);
  assert.strictEqual(hasSubmittedKyc(undefined), false);
});

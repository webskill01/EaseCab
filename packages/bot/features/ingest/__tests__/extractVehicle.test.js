'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { extractVehicle } = require('../extractVehicle');

test('delegates to shared matchVehicle', () => {
  assert.strictEqual(extractVehicle('need innova crysta'), 'Innova');
  assert.strictEqual(extractVehicle('no vehicle here'), null);
});

test('preserves matchVehicle specificity ordering (Innova before SUV)', () => {
  // "crysta" is an Innova keyword; must not fall through to SUV.
  assert.strictEqual(extractVehicle('Innova Crysta SUV available'), 'Innova');
  assert.strictEqual(extractVehicle('Ertiga with carrier'), 'SUV');
});

test('returns null for empty / non-string input', () => {
  assert.strictEqual(extractVehicle(''), null);
  assert.strictEqual(extractVehicle(null), null);
  assert.strictEqual(extractVehicle(undefined), null);
});

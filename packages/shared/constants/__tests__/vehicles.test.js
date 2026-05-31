'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { VEHICLE_TYPES, VEHICLE_KEYWORDS, matchVehicle } = require('../vehicles');

test('VEHICLE_TYPES is frozen', () => {
  assert.ok(Object.isFrozen(VEHICLE_TYPES));
});

test('VEHICLE_KEYWORDS is frozen', () => {
  assert.ok(Object.isFrozen(VEHICLE_KEYWORDS));
});

test('matchVehicle maps keywords to labels', () => {
  assert.strictEqual(matchVehicle('need innova crysta kal'), VEHICLE_TYPES.INNOVA);
  assert.strictEqual(matchVehicle('dzire chahiye'), VEHICLE_TYPES.SEDAN);
  assert.strictEqual(matchVehicle('17 seater tempo'), VEHICLE_TYPES.TEMPO_TRAVELLER);
  assert.strictEqual(matchVehicle('hello bhai'), null);
});

test('matchVehicle returns null for non-string / empty', () => {
  assert.strictEqual(matchVehicle(''), null);
  assert.strictEqual(matchVehicle(null), null);
  assert.strictEqual(matchVehicle(undefined), null);
});

test('more specific labels win (innova before suv, tempo before bus)', () => {
  assert.strictEqual(matchVehicle('innova suv'), VEHICLE_TYPES.INNOVA);
  assert.strictEqual(matchVehicle('mini bus tempo traveller'), VEHICLE_TYPES.TEMPO_TRAVELLER);
});

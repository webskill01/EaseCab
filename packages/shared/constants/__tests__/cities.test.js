'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { CITY_NEAREST } = require('../cities');

test('CITY_NEAREST bounds are frozen and sane', () => {
  assert.equal(CITY_NEAREST.MAX_RADIUS_KM, 150);
  assert.equal(Object.isFrozen(CITY_NEAREST), true);
});

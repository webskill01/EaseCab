'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const shared = require('../../../index'); // @easecab/shared root barrel

test('root barrel exports createCityResolver and normalizeCityText', () => {
  assert.equal(typeof shared.createCityResolver, 'function');
  assert.equal(typeof shared.normalizeCityText, 'function');
});

test('root barrel still exports existing members (no regression)', () => {
  assert.equal(typeof shared.AppError, 'function');
  assert.ok(shared.ERROR_CODES);
  assert.equal(typeof shared.redisKey, 'function');
});

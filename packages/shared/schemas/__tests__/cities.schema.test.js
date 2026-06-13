'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { citySearchQuerySchema, citiesNearestQuerySchema } = require('../cities.schema');

test('city search: requires q >= 2 chars, defaults limit to 10, rejects over-max', () => {
  assert.equal(citySearchQuerySchema.safeParse({ q: 'a' }).success, false);
  const ok = citySearchQuerySchema.parse({ q: 'amb' });
  assert.equal(ok.limit, 10);
  assert.equal(citySearchQuerySchema.safeParse({ q: 'amb', limit: '999' }).success, false); // above max
});

test('citiesNearestQuery: coerces lat/lng strings and bounds them', () => {
  assert.deepEqual(citiesNearestQuerySchema.parse({ lat: '30.7', lng: '76.7' }), { lat: 30.7, lng: 76.7 });
  assert.equal(citiesNearestQuerySchema.safeParse({ lat: '91', lng: '0' }).success, false); // lat out of range
  assert.equal(citiesNearestQuerySchema.safeParse({ lat: '0' }).success, false); // lng required
});

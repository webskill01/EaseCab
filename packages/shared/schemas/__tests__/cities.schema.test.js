'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { citySearchQuerySchema } = require('../cities.schema');

test('city search: requires q >= 2 chars, defaults limit to 10, rejects over-max', () => {
  assert.equal(citySearchQuerySchema.safeParse({ q: 'a' }).success, false);
  const ok = citySearchQuerySchema.parse({ q: 'amb' });
  assert.equal(ok.limit, 10);
  assert.equal(citySearchQuerySchema.safeParse({ q: 'amb', limit: '999' }).success, false); // above max
});

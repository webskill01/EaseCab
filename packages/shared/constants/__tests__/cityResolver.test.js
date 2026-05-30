'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CITY_RESOLVER, RESOLVE_STATUS, RESOLVE_LAYER } = require('../cityResolver');

test('CITY_RESOLVER has the locked thresholds and is frozen', () => {
  assert.equal(CITY_RESOLVER.FUZZY_AUTO_ACCEPT, 0.55);
  assert.equal(CITY_RESOLVER.FUZZY_WINNER_GAP, 0.1);
  assert.equal(CITY_RESOLVER.FUZZY_QUEUE_FLOOR, 0.3);
  assert.equal(CITY_RESOLVER.MIN_LENGTH, 2);
  assert.equal(CITY_RESOLVER.CACHE_TTL_SECONDS, 86400);
  assert.deepEqual(CITY_RESOLVER.CACHE_KEY_PARTS, ['city', 'resolve']);
  assert.ok(Object.isFrozen(CITY_RESOLVER));
  assert.ok(Object.isFrozen(CITY_RESOLVER.CACHE_KEY_PARTS));
});

test('status + layer enums are frozen with expected values', () => {
  assert.deepEqual({ ...RESOLVE_STATUS }, { RESOLVED: 'resolved', UNRESOLVED: 'unresolved' });
  assert.deepEqual({ ...RESOLVE_LAYER }, { CACHE: 'cache', EXACT: 'exact', FUZZY: 'fuzzy' });
  assert.ok(Object.isFrozen(RESOLVE_STATUS));
  assert.ok(Object.isFrozen(RESOLVE_LAYER));
});

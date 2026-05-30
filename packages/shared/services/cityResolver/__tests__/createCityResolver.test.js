'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCityResolver } = require('../createCityResolver');

/** Minimal stub builders — no real Prisma/Redis. */
function makeRedis(overrides = {}) {
  return { get: async () => null, set: async () => 'OK', ...overrides };
}
function makePrisma(overrides = {}) {
  return {
    cityAlias: { findFirst: async () => null },
    city: { findFirst: async () => null },
    unresolvedCityString: { upsert: async () => ({}) },
    $queryRaw: async () => [],
    ...overrides,
  };
}
const silentLogger = { warn: () => {}, error: () => {} };

test('throws if prisma or redis is missing', () => {
  assert.throws(() => createCityResolver({ redis: makeRedis() }), /prisma/);
  assert.throws(() => createCityResolver({ prisma: makePrisma() }), /redis/);
});

test('returns unresolved for too-short input without touching the DB', async () => {
  let dbHit = false;
  const prisma = makePrisma({ cityAlias: { findFirst: async () => { dbHit = true; return null; } } });
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('a'); // 1 char after normalize
  assert.equal(result.status, 'unresolved');
  assert.equal(result.cityId, null);
  assert.equal(result.layer, null);
  assert.equal(dbHit, false);
});

test('cache hit returns resolved without touching the DB', async () => {
  let dbHit = false;
  const redis = makeRedis({
    get: async () => JSON.stringify({ cityId: 'uuid-delhi', canonicalName: 'Delhi' }),
  });
  const prisma = makePrisma({ cityAlias: { findFirst: async () => { dbHit = true; return null; } } });
  const resolver = createCityResolver({ prisma, redis, logger: silentLogger });

  const result = await resolver.resolve('Delhi');
  assert.deepEqual(result, {
    status: 'resolved', cityId: 'uuid-delhi', canonicalName: 'Delhi', layer: 'cache', confidence: 1,
  });
  assert.equal(dbHit, false);
});

test('redis get failure degrades to DB instead of throwing', async () => {
  const redis = makeRedis({ get: async () => { throw new Error('redis down'); } });
  // city/alias return null → falls through to unresolved (no throw)
  const resolver = createCityResolver({ prisma: makePrisma(), redis, logger: silentLogger });

  const result = await resolver.resolve('someplace');
  assert.equal(result.status, 'unresolved'); // degraded path completed normally
});

test('exact alias match resolves and writes through to cache', async () => {
  let cached = null;
  const redis = makeRedis({ set: async (k, v) => { cached = { k, v }; return 'OK'; } });
  const prisma = makePrisma({
    cityAlias: { findFirst: async () => ({ cityId: 'uuid-ggn', city: { canonicalName: 'Gurgaon' } }) },
  });
  const resolver = createCityResolver({ prisma, redis, logger: silentLogger });

  const result = await resolver.resolve('ggn');
  assert.deepEqual(result, {
    status: 'resolved', cityId: 'uuid-ggn', canonicalName: 'Gurgaon', layer: 'exact', confidence: 1,
  });
  assert.ok(cached, 'should write through to cache');
  assert.equal(cached.k, 'easecab:city:resolve:ggn');
});

test('exact canonical-name match resolves when no alias matches', async () => {
  const prisma = makePrisma({
    cityAlias: { findFirst: async () => null },
    city: { findFirst: async () => ({ id: 'uuid-mohali', canonicalName: 'Mohali' }) },
  });
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('mohali');
  assert.equal(result.status, 'resolved');
  assert.equal(result.layer, 'exact');
  assert.equal(result.cityId, 'uuid-mohali');
});

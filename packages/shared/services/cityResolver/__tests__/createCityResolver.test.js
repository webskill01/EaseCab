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

/** Build a prisma stub whose fuzzy query returns the given candidate rows. */
function makePrismaFuzzy(rows) {
  return makePrisma({
    cityAlias: { findFirst: async () => null },
    city: { findFirst: async () => null },
    $queryRaw: async () => rows,
  });
}

test('fuzzy auto-accepts a clear winner (>=0.55 and gap >=0.1)', async () => {
  const prisma = makePrismaFuzzy([
    { city_id: 'uuid-chd', canonical_name: 'Chandigarh', similarity: 0.7 },
    { city_id: 'uuid-other', canonical_name: 'Other', similarity: 0.4 },
  ]);
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('chandigrah');
  assert.equal(result.status, 'resolved');
  assert.equal(result.layer, 'fuzzy');
  assert.equal(result.cityId, 'uuid-chd');
  assert.equal(result.canonicalName, 'Chandigarh');
  assert.ok(Math.abs(result.confidence - 0.7) < 1e-9);
});

test('fuzzy does NOT auto-accept an ambiguous top match (gap < 0.1)', async () => {
  const prisma = makePrismaFuzzy([
    { city_id: 'uuid-a', canonical_name: 'Patiala', similarity: 0.6 },
    { city_id: 'uuid-b', canonical_name: 'Patran', similarity: 0.55 },
  ]);
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('patala');
  assert.equal(result.status, 'unresolved'); // queued (Task 7 records the suggestion)
});

test('fuzzy below auto-accept threshold is not resolved', async () => {
  const prisma = makePrismaFuzzy([{ city_id: 'uuid-a', canonical_name: 'Ambala', similarity: 0.45 }]);
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('ambl');
  assert.equal(result.status, 'unresolved');
});

test('mid-band fuzzy queues the normalized text WITH a suggestion', async () => {
  let upsertArg = null;
  const prisma = makePrismaFuzzy([{ city_id: 'uuid-a', canonical_name: 'Ambala', similarity: 0.45 }]);
  prisma.unresolvedCityString.upsert = async (arg) => { upsertArg = arg; return {}; };
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('ambl xyz');
  assert.equal(result.status, 'unresolved');
  assert.equal(upsertArg.where.rawText, 'ambl xyz');
  assert.equal(upsertArg.create.suggestedCityId, 'uuid-a');
  assert.equal(upsertArg.create.occurrenceCount, 1);
  assert.deepEqual(upsertArg.update, { occurrenceCount: { increment: 1 } });
});

test('no-candidate fuzzy queues with no suggestion', async () => {
  let upsertArg = null;
  const prisma = makePrismaFuzzy([]); // nothing >= floor
  prisma.unresolvedCityString.upsert = async (arg) => { upsertArg = arg; return {}; };
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('zzqq plot');
  assert.equal(result.status, 'unresolved');
  assert.equal(upsertArg.create.suggestedCityId, null);
});

test('over-length input returns unresolved before touching Redis or DB (DoS guard)', async () => {
  let touched = false;
  const redis = makeRedis({ get: async () => { touched = true; return null; } });
  const prisma = makePrisma({ cityAlias: { findFirst: async () => { touched = true; return null; } } });
  const resolver = createCityResolver({ prisma, redis, logger: silentLogger });

  const result = await resolver.resolve('x'.repeat(200));
  assert.equal(result.status, 'unresolved');
  assert.equal(touched, false);
});

test('input with a phone-number-like digit run throws VALIDATION_ERROR (PII guard)', async () => {
  const resolver = createCityResolver({ prisma: makePrisma(), redis: makeRedis(), logger: silentLogger });

  await assert.rejects(
    () => resolver.resolve('9876543210 delhi airport'),
    (err) => err.name === 'AppError' && err.code === 'VALIDATION_ERROR' && err.statusCode === 400,
  );
});

test('short numbers in city fragments (e.g. "sector 17") are allowed', async () => {
  const prisma = makePrisma({
    cityAlias: { findFirst: async () => ({ cityId: 'uuid-chd', city: { canonicalName: 'Chandigarh' } }) },
  });
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  const result = await resolver.resolve('sector 17');
  assert.equal(result.status, 'resolved'); // 2-digit run does not trip the phone guard
});

test('malformed cache entry (missing fields) degrades to DB instead of returning bad data', async () => {
  const redis = makeRedis({ get: async () => JSON.stringify({ foo: 'bar' }) });
  const resolver = createCityResolver({ prisma: makePrisma(), redis, logger: silentLogger });

  const result = await resolver.resolve('delhi'); // cache miss-equivalent → DB → unresolved
  assert.equal(result.status, 'unresolved');
});

test('DB failure throws AppError(INTERNAL_ERROR)', async () => {
  const prisma = makePrisma({
    cityAlias: { findFirst: async () => { throw new Error('db down'); } },
  });
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger: silentLogger });

  await assert.rejects(
    () => resolver.resolve('delhi'),
    (err) => err.name === 'AppError' && err.code === 'INTERNAL_ERROR' && err.statusCode === 500,
  );
});

// E2 #24 hardening: a failed queue write must NOT abort resolution (previously it
// bubbled to INTERNAL_ERROR and the bot silently dropped the unresolved string).
test('queueUnresolved write failure degrades to unresolved instead of throwing', async () => {
  let logged = false;
  const prisma = makePrismaFuzzy([]); // no fuzzy candidate → falls to queueUnresolved
  prisma.unresolvedCityString.upsert = async () => { throw new Error('queue write blip'); };
  const logger = { warn: () => { logged = true; }, error: () => {} };
  const resolver = createCityResolver({ prisma, redis: makeRedis(), logger });

  const result = await resolver.resolve('zzqq plot'); // unresolvable fragment
  assert.equal(result.status, 'unresolved'); // resolution completed, did not throw
  assert.equal(result.cityId, null);
  assert.equal(logged, true); // failure surfaced as an operational warning
});

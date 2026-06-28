'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createCityBackfillService } = require('../cityBackfill.service');

const silentLogger = { info() {}, warn() {}, error() {} };

/** A repo double recording the writes the service makes. */
function fakeRepo({ pending = [], cities = [], rides = [] } = {}) {
  return {
    aliases: [],
    reviewed: [],
    patched: [],
    async listPending() { return pending; },
    async listActiveCities() { return cities; },
    async upsertAlias(cityId, aliasText) { this.aliases.push({ cityId, aliasText }); },
    async markStringReviewed(rawText) { this.reviewed.push(rawText); },
    async listUnresolvedRides() { return rides; },
    async patchRideCity(id, field, cityId) { this.patched.push({ id, field, cityId }); },
  };
}

test('resolves a string → writes ai alias, dequeues, and backfills the matching live ride', async () => {
  const repo = fakeRepo({
    pending: [{ rawText: 'ldhana', suggestedCityId: null }],
    cities: [{ id: 'c-ldh', canonicalName: 'Ludhiana' }],
    rides: [{ id: 'r1', pickupCityId: null, dropCityId: 'c-del', pickupRaw: 'ldhana', dropRaw: 'delhi' }],
  });
  const llm = { resolveBatch: async () => new Map([['ldhana', 'c-ldh']]) };
  // After the alias is written, the resolver now resolves 'ldhana'.
  const resolver = { resolve: async (raw) => (raw === 'ldhana' ? { status: 'resolved', cityId: 'c-ldh' } : { status: 'unresolved', cityId: null }) };

  const svc = createCityBackfillService({ repo, llm, resolver, logger: silentLogger });
  const out = await svc.sweep();

  assert.deepStrictEqual(repo.aliases, [{ cityId: 'c-ldh', aliasText: 'ldhana' }]);
  assert.deepStrictEqual(repo.reviewed, ['ldhana']);
  assert.deepStrictEqual(repo.patched, [{ id: 'r1', field: 'pickupCityId', cityId: 'c-ldh' }]);
  assert.deepStrictEqual(out, { swept: 1, aliased: 1, ridesBackfilled: 1 });
});

test('does not patch a side that is already resolved', async () => {
  const repo = fakeRepo({
    pending: [],
    cities: [],
    rides: [{ id: 'r1', pickupCityId: 'c-ldh', dropCityId: null, pickupRaw: 'ldh', dropRaw: 'delhi' }],
  });
  const llm = { resolveBatch: async () => new Map() };
  const resolver = { resolve: async () => ({ status: 'resolved', cityId: 'c-del' }) };

  const svc = createCityBackfillService({ repo, llm, resolver, logger: silentLogger });
  await svc.sweep();

  // Only the null drop side is patched; the already-set pickup is untouched.
  assert.deepStrictEqual(repo.patched, [{ id: 'r1', field: 'dropCityId', cityId: 'c-del' }]);
});

test('PII guard: a queued string with a phone-length digit run is never aliased', async () => {
  const repo = fakeRepo({
    pending: [{ rawText: '9876543210', suggestedCityId: null }],
    cities: [{ id: 'c-ldh', canonicalName: 'Ludhiana' }],
    rides: [],
  });
  let sentStrings = null;
  const llm = { resolveBatch: async (strings) => { sentStrings = strings; return new Map(); } };
  const resolver = { resolve: async () => ({ status: 'unresolved', cityId: null }) };

  const svc = createCityBackfillService({ repo, llm, resolver, logger: silentLogger });
  const out = await svc.sweep();

  // Scrubbed to nothing → the LLM is never even called with the phone fragment.
  assert.ok(sentStrings === null || !sentStrings.includes('9876543210'), 'phone-like fragment never reaches the LLM');
  assert.strictEqual(out.aliased, 0);
});

test('a resolver throw on one ride does not abort the sweep', async () => {
  const repo = fakeRepo({
    pending: [],
    cities: [],
    rides: [
      { id: 'r1', pickupCityId: null, dropCityId: 'c-del', pickupRaw: 'junk', dropRaw: 'delhi' },
      { id: 'r2', pickupCityId: null, dropCityId: 'c-del', pickupRaw: 'ldhana', dropRaw: 'delhi' },
    ],
  });
  const llm = { resolveBatch: async () => new Map() };
  const resolver = {
    resolve: async (raw) => {
      if (raw === 'junk') throw new Error('VALIDATION_ERROR');
      return { status: 'resolved', cityId: 'c-ldh' };
    },
  };

  const svc = createCityBackfillService({ repo, llm, resolver, logger: silentLogger });
  const out = await svc.sweep();

  assert.deepStrictEqual(repo.patched, [{ id: 'r2', field: 'pickupCityId', cityId: 'c-ldh' }]);
  assert.strictEqual(out.ridesBackfilled, 1);
});

test('empty queue + no rides → zero-count summary, no throw', async () => {
  const svc = createCityBackfillService({ repo: fakeRepo(), llm: { resolveBatch: async () => new Map() }, resolver: { resolve: async () => ({ status: 'unresolved' }) }, logger: silentLogger });
  const out = await svc.sweep();
  assert.deepStrictEqual(out, { swept: 0, aliased: 0, ridesBackfilled: 0 });
});

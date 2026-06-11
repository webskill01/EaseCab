'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPostParser } = require('../postedRides.parse');

const VOCAB = ['Delhi', 'Chandigarh', 'Mohali'];
const fakeRepo = { listCityVocabulary: async () => VOCAB };
// Resolver: resolves known fragments, "unresolved" for the rest.
const fakeResolver = {
  resolve: async (raw) => {
    const map = { delhi: { id: 'c-del', name: 'Delhi' }, chandigarh: { id: 'c-chd', name: 'Chandigarh' } };
    const hit = map[String(raw).toLowerCase().trim()];
    return hit
      ? { status: 'resolved', cityId: hit.id, canonicalName: hit.name }
      : { status: 'unresolved', cityId: null, canonicalName: null };
  },
};

test('parse extracts route, resolves cities, vehicle and phone', async () => {
  const parser = createPostParser({ repo: fakeRepo, resolver: fakeResolver });
  const draft = await parser.parse('Innova chahiye Delhi to Chandigarh call 9876543210');
  assert.equal(draft.fromCityId, 'c-del');
  assert.equal(draft.fromCityName, 'Delhi');
  assert.equal(draft.toCityId, 'c-chd');
  assert.equal(draft.toCityName, 'Chandigarh');
  assert.equal(draft.vehicleType, 'Innova');
  assert.equal(draft.phone, '+919876543210');
});

test('parse keeps unresolved fragment as raw with null id', async () => {
  const parser = createPostParser({ repo: fakeRepo, resolver: fakeResolver });
  const draft = await parser.parse('Mohali to Delhi');
  assert.equal(draft.fromCityId, null);
  assert.equal(draft.fromCityRaw, 'Mohali'); // raw fragment preserved for create fallback
  assert.equal(draft.toCityId, 'c-del');
});

test('parse returns all-null draft on junk', async () => {
  const parser = createPostParser({ repo: fakeRepo, resolver: fakeResolver });
  const draft = await parser.parse('hello good morning');
  assert.equal(draft.fromCityId, null);
  assert.equal(draft.fromCityRaw, null);
  assert.equal(draft.toCityId, null);
  assert.equal(draft.vehicleType, null);
  assert.equal(draft.phone, null);
});

test('parse treats a resolver throw as unresolved (never throws)', async () => {
  const throwing = { resolve: async () => { throw new Error('boom'); } };
  const parser = createPostParser({ repo: fakeRepo, resolver: throwing });
  const draft = await parser.parse('Delhi to Chandigarh');
  assert.equal(draft.fromCityId, null);
  assert.equal(draft.fromCityRaw, 'Delhi');
});

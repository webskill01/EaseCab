'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createCitiesService } = require('../cities.service');

test('searchCities: lowercases + strips LIKE specials before hitting the repo', async () => {
  let seen;
  const repo = { async searchCities(args) { seen = args; return [{ id: 'c1', canonicalName: 'Ambala' }]; } };
  const svc = createCitiesService({ repo });
  const out = await svc.searchCities({ q: '  AMB%_\\ ', limit: 10 });
  assert.equal(seen.q, 'amb');
  assert.equal(seen.floor, 0.2);
  assert.deepEqual(out, { cities: [{ id: 'c1', canonicalName: 'Ambala' }] });
});

test('searchCities: returns empty without querying when sanitized q is too short', async () => {
  let called = false;
  const repo = { async searchCities() { called = true; return []; } };
  const svc = createCitiesService({ repo });
  const out = await svc.searchCities({ q: '%%', limit: 10 });
  assert.equal(called, false);
  assert.deepEqual(out, { cities: [] });
});

test('nearestCity: delegates with the configured radius and wraps the result', async () => {
  let seen;
  const repo = { async findNearest(args) { seen = args; return { id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4.2 }; } };
  const out = await createCitiesService({ repo }).nearestCity({ lat: 30.73, lng: 76.78 });
  assert.deepEqual(seen, { lat: 30.73, lng: 76.78, maxRadiusKm: 150 });
  assert.deepEqual(out, { city: { id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4.2 } });
});

test('nearestCity: returns { city: null } when none in range', async () => {
  const repo = { async findNearest() { return null; } };
  const out = await createCitiesService({ repo }).nearestCity({ lat: 0, lng: 0 });
  assert.deepEqual(out, { city: null });
});

const CITY_ROW = { id: 'c1', canonicalName: 'Ambala', namePa: 'ਅੰਬਾਲਾ', nameHi: 'अंबाला' };

test('listAllCities: returns the repo list wrapped in { cities } when no redis', async () => {
  let called = false;
  const repo = { async listAll() { called = true; return [CITY_ROW]; } };
  const out = await createCitiesService({ repo }).listAllCities();
  assert.equal(called, true);
  assert.deepEqual(out, { cities: [CITY_ROW] });
});

test('listAllCities: serves a Redis cache hit without touching the repo', async () => {
  let called = false;
  const repo = { async listAll() { called = true; return []; } };
  const redis = { async get() { return JSON.stringify([CITY_ROW]); }, async set() { throw new Error('should not write on hit'); } };
  const out = await createCitiesService({ repo, redis }).listAllCities();
  assert.equal(called, false);
  assert.deepEqual(out, { cities: [CITY_ROW] });
});

test('listAllCities: on a miss, queries the repo and writes the cache', async () => {
  let wrote;
  const repo = { async listAll() { return [CITY_ROW]; } };
  const redis = { async get() { return null; }, async set(key, val, mode, ttl) { wrote = { key, val, mode, ttl }; } };
  const out = await createCitiesService({ repo, redis }).listAllCities();
  assert.deepEqual(out, { cities: [CITY_ROW] });
  assert.equal(wrote.key, 'easecab:cities:all');
  assert.equal(wrote.mode, 'EX');
  assert.equal(wrote.ttl, 300);
});

test('listAllCities: degrades to the DB when the cache read throws', async () => {
  const repo = { async listAll() { return [CITY_ROW]; } };
  const redis = { async get() { throw new Error('redis down'); }, async set() { /* best effort */ } };
  const out = await createCitiesService({ repo, redis }).listAllCities();
  assert.deepEqual(out, { cities: [CITY_ROW] });
});

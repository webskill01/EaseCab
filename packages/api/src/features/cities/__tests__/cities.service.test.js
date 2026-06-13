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

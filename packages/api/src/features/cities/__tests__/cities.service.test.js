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

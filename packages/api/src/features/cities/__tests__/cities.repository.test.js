'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createCitiesRepository } = require('../cities.repository');

test('searchCities: passes q/floor/limit as params and maps rows to {id,canonicalName}', async () => {
  let captured;
  const prisma = {
    async $queryRaw(_strings, ...values) {
      captured = values;
      return [
        { city_id: 'c1', canonical_name: 'Ambala' },
        { city_id: 'c2', canonical_name: 'Amritsar' },
      ];
    },
  };
  const repo = createCitiesRepository({ prisma });
  const out = await repo.searchCities({ q: 'amb', limit: 10, floor: 0.2 });
  assert.deepEqual(out, [{ id: 'c1', canonicalName: 'Ambala' }, { id: 'c2', canonicalName: 'Amritsar' }]);
  // q appears as a bound param (used 4x in the SQL), floor and limit are bound too.
  assert.ok(captured.includes('amb'));
  assert.ok(captured.includes(0.2));
  assert.ok(captured.includes(10));
});

test('findNearest: returns the closest active city within radius', async () => {
  let captured;
  const prisma = {
    async $queryRaw(_strings, ...values) {
      captured = values;
      return [{ city_id: 'c1', canonical_name: 'Chandigarh', distance_km: 4.2 }];
    },
  };
  const repo = createCitiesRepository({ prisma });
  const out = await repo.findNearest({ lat: 30.73, lng: 76.78, maxRadiusKm: 150 });
  assert.deepEqual(out, { id: 'c1', canonicalName: 'Chandigarh', distanceKm: 4.2 });
  assert.ok(captured.includes(30.73));
  assert.ok(captured.includes(76.78));
  assert.ok(captured.includes(150));
});

test('findNearest: returns null when no city is in range', async () => {
  const prisma = { async $queryRaw() { return []; } };
  const repo = createCitiesRepository({ prisma });
  assert.equal(await repo.findNearest({ lat: 0, lng: 0, maxRadiusKm: 150 }), null);
});

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

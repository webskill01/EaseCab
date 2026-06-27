'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminStatsService } = require('../adminStats.service');

test('get returns the repository counts unchanged', async () => {
  const counts = { pendingVerifications: 2, openReports: 1, unresolvedCities: 5, ridesToday: 30 };
  const svc = createAdminStatsService({ repo: { async counts() { return counts; } } });
  assert.deepStrictEqual(await svc.get(), counts);
});

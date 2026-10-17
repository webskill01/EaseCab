'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminStatsService } = require('../adminStats.service');

test('get returns the repository counts unchanged', async () => {
  const counts = { pendingVerifications: 2, openReports: 1, unresolvedCities: 5, ridesToday: 30 };
  const svc = createAdminStatsService({ repo: { async counts() { return counts; } } });
  assert.deepStrictEqual(await svc.get(), counts);
});

test('growth maps rows, converts paise to rupees and sums totals', async () => {
  const rows = [
    { day: new Date('2026-10-17T00:00:00Z'), signups: 40, paidAccounts: 2, payments: 3, revenuePaise: 44700 },
    { day: new Date('2026-10-15T00:00:00Z'), signups: 50, paidAccounts: 1, payments: 1, revenuePaise: 14900 },
  ];
  const svc = createAdminStatsService({
    repo: { async growthDaily() { return rows; }, async activeMembers() { return 3; } },
  });
  const g = await svc.growth();
  assert.strictEqual(g.since, '2026-10-15');
  assert.deepStrictEqual(g.days[0], { day: '2026-10-17', signups: 40, paidAccounts: 2, payments: 3, revenue: 447 });
  assert.deepStrictEqual(g.totals, { signups: 90, paidAccounts: 3, payments: 4, revenue: 596, activeMembers: 3 });
});

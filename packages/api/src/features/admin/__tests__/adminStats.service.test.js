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

const raw = (o = {}) => ({
  week: new Date('2026-10-12T00:00:00Z'), signups: 100, totalSignups: 200, newPayers: 10, totalPayers: 30,
  payments: 12, revenuePaise: 178800, activePaid: 25, renewalsDue: 20, renewed: 15, contacts: 60,
  activeDrivers: 40, botRides: 90, botContactedFast: 50, postedRides: 10, postedContactedFast: 5, ...o,
});

test('trackRecord derives MRR, conversion, renewal, LTV and liquidity', async () => {
  const svc = createAdminStatsService({ repo: { async trackRecordWeekly() { return [raw()]; }, async activeMembers() { return 25; } } });
  const t = await svc.trackRecord();
  assert.deepStrictEqual(t.targets, { renewalRate: 70, conversion: 10, liquidity: 60 });
  assert.deepStrictEqual(t.weeks[0], {
    week: '2026-10-12', signups: 100, newPayers: 10, payments: 12, revenue: 1788,
    activePaid: 25, mrr: 3725, conversion: 15, renewalsDue: 20, renewalRate: 75,
    ltv: 596, activeDrivers: 40, contacts: 60, rides: 100, liquidity: 55,
  });
});

test('trackRecord returns null ratios when there is nothing to divide', async () => {
  const empty = raw({ totalSignups: 0, renewalsDue: 0, renewed: 0, botRides: 0, postedRides: 0 });
  const full = raw({ renewalsDue: 4, renewed: 4 });
  const svc = createAdminStatsService({ repo: { async trackRecordWeekly() { return [empty, full]; }, async activeMembers() { return 25; } } });
  const [a, b] = (await svc.trackRecord()).weeks;
  assert.strictEqual(a.conversion, null);
  assert.strictEqual(a.renewalRate, null);
  assert.strictEqual(a.ltv, null);
  assert.strictEqual(a.liquidity, null);
  assert.strictEqual(b.renewalRate, 100);
  assert.strictEqual(b.ltv, null); // zero churn → no finite LTV
});

test('trackRecord counts active paid from payments only, never the live member count', async () => {
  const svc = createAdminStatsService({
    repo: { async trackRecordWeekly() { return [raw({ activePaid: 30 }), raw({ activePaid: 20 })]; }, async activeMembers() { return 32; } },
  });
  const [now, prev] = (await svc.trackRecord()).weeks;
  assert.strictEqual(now.activePaid, 30);
  assert.strictEqual(now.mrr, 30 * 149);
  assert.strictEqual(prev.activePaid, 20);
});

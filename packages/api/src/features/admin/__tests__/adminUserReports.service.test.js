'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminUserReportsService } = require('../adminUserReports.service');

const USER_ROW = {
  id: 'u1', name: 'Gurpreet', baseCity: 'Ludhiana', vehicleType: 'Innova', flaggedAt: new Date(),
  reportsReceived: [
    { id: 'rep1', reason: 'spam', remarks: 'junk', screenshotUrl: null, createdAt: new Date(), reporter: { id: 'a', name: 'A', phone: '+919876543210' } },
    { id: 'rep2', reason: 'fake', remarks: null, screenshotUrl: 'reports/a/x.jpg', createdAt: new Date(), reporter: { id: 'b', name: null, phone: '+911112223334' } },
  ],
};

function fakeRepo(overrides = {}) {
  return {
    async listReportedUsers() { return { rows: [USER_ROW], total: 1 }; },
    async hasOpenReports(id) { return id === 'u1'; },
    async reviewUser() { return { count: 2 }; },
    ...overrides,
  };
}

test('list shapes a reported user, masks reporter phones, counts open reports', async () => {
  const out = await createAdminUserReportsService({ repo: fakeRepo() }).list({ page: 1, limit: 20 });
  const item = out.items[0];
  assert.strictEqual(item.user.id, 'u1');
  assert.strictEqual(item.user.flagged, true);
  assert.strictEqual(item.reportCount, 2);
  assert.strictEqual(item.reports[0].reporter.phoneMasked, '••••3210');
  assert.strictEqual(item.reports[0].reporter.phone, undefined);
  assert.deepStrictEqual({ page: out.page, limit: out.limit, total: out.total }, { page: 1, limit: 20, total: 1 });
});

test('list presigns a report screenshot via the r2 boundary (never a raw key)', async () => {
  const r2 = { async presignGet({ key }) { return `https://signed/${key}`; } };
  const item = (await createAdminUserReportsService({ repo: fakeRepo(), r2 }).list({ page: 1, limit: 20 })).items[0];
  assert.strictEqual(item.reports[1].screenshotUrl, 'https://signed/reports/a/x.jpg');
});

test('list yields null screenshotUrl with no r2 boundary', async () => {
  const item = (await createAdminUserReportsService({ repo: fakeRepo() }).list({ page: 1, limit: 20 })).items[0];
  assert.strictEqual(item.reports[1].screenshotUrl, null);
});

test('review throws NOT_FOUND when the user has no open reports', async () => {
  const svc = createAdminUserReportsService({ repo: fakeRepo({ async hasOpenReports() { return false; } }) });
  await assert.rejects(() => svc.review('gone', { action: 'reinstate' }, 'adm1'), (e) => e.code === 'NOT_FOUND');
});

test('review delegates to reviewUser and returns the resolved count', async () => {
  let received;
  const repo = fakeRepo({ async reviewUser(args) { received = args; return { count: 2 }; } });
  const out = await createAdminUserReportsService({ repo }).review('u1', { action: 'uphold' }, 'adm1');
  assert.deepStrictEqual(out, { userId: 'u1', action: 'uphold', resolved: 2 });
  assert.strictEqual(received.reviewedBy, 'adm1');
  assert.strictEqual(received.action, 'uphold');
});

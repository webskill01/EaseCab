'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminReportsService } = require('../adminReports.service');

const BOT_ROW = {
  id: 'r1', reason: 'spam', remarks: 'junk', screenshotUrl: null, createdAt: new Date(), reviewedAt: null,
  reporter: { id: 'u1', name: 'Reporter', phone: '+919876543210' },
  ride: { id: 'ride1', displayText: 'Amritsar to Delhi', status: 'fresh', pickupRaw: 'asr', dropRaw: 'del', pickupCity: { canonicalName: 'Amritsar' }, dropCity: { canonicalName: 'Delhi' } },
  postedRide: null,
};

function fakeRepo(overrides = {}) {
  return {
    async listReports() { return { rows: [BOT_ROW], total: 1 }; },
    async findById(id) { return id === 'r1' ? { id: 'r1', rideId: 'ride1', postedRideId: null } : null; },
    async reviewTarget() { return { count: 3 }; },
    ...overrides,
  };
}

test('list masks the reporter phone and exposes a bot-ride target summary', async () => {
  const svc = createAdminReportsService({ repo: fakeRepo() });
  const out = await svc.list({ page: 1, limit: 20, status: 'open' });
  const item = out.items[0];
  assert.strictEqual(item.reporter.phoneMasked, '••••3210');
  assert.strictEqual(item.reporter.phone, undefined);
  assert.strictEqual(item.target.kind, 'bot');
  assert.strictEqual(item.target.fromCity, 'Amritsar');
  assert.strictEqual(item.target.toCity, 'Delhi');
  assert.strictEqual(item.target.status, 'fresh');
  assert.deepStrictEqual({ page: out.page, limit: out.limit, total: out.total }, { page: 1, limit: 20, total: 1 });
});

test('list shapes a posted-ride target (raw-city + poster-name fallbacks)', async () => {
  const repo = fakeRepo({
    async listReports() {
      return {
        rows: [{
          id: 'r2', reason: 'fake', remarks: null, screenshotUrl: null, createdAt: new Date(), reviewedAt: null,
          reporter: { id: 'u2', name: null, phone: '+911112223334' },
          ride: null,
          postedRide: { id: 'p1', status: 'active', fromCityRaw: 'Mohali', toCityRaw: 'Chd', fromCity: null, toCity: null, poster: { name: 'Driver' } },
        }],
        total: 1,
      };
    },
  });
  const svc = createAdminReportsService({ repo });
  const item = (await svc.list({ page: 1, limit: 20, status: 'open' })).items[0];
  assert.strictEqual(item.target.kind, 'posted');
  assert.strictEqual(item.target.fromCity, 'Mohali');
  assert.strictEqual(item.target.toCity, 'Chd');
  assert.strictEqual(item.target.posterName, 'Driver');
});

test('list presigns the screenshotUrl via the r2 boundary (never returns a raw key)', async () => {
  const repo = fakeRepo({
    async listReports() { return { rows: [{ ...BOT_ROW, id: 'r3', screenshotUrl: 'reports/abc.jpg' }], total: 1 }; },
  });
  const r2 = { async presignGet({ key }) { return `https://signed/${key}`; } };
  const svc = createAdminReportsService({ repo, r2 });
  const item = (await svc.list({ page: 1, limit: 20, status: 'open' })).items[0];
  assert.strictEqual(item.screenshotUrl, 'https://signed/reports/abc.jpg');
});

test('list yields null screenshotUrl when there is no key or no r2 boundary', async () => {
  const repo = fakeRepo({
    async listReports() { return { rows: [{ ...BOT_ROW, id: 'r4', screenshotUrl: 'reports/x.jpg' }], total: 1 }; },
  });
  const svc = createAdminReportsService({ repo }); // no r2 injected
  const item = (await svc.list({ page: 1, limit: 20, status: 'open' })).items[0];
  assert.strictEqual(item.screenshotUrl, null);
});

test('review on an unknown id throws NOT_FOUND', async () => {
  const svc = createAdminReportsService({ repo: fakeRepo() });
  await assert.rejects(() => svc.review('missing', { action: 'dismiss' }, 'adm1'), (err) => err.code === 'NOT_FOUND');
});

test('review delegates to reviewTarget and returns the resolved count', async () => {
  let received;
  const repo = fakeRepo({ async reviewTarget(args) { received = args; return { count: 3 }; } });
  const svc = createAdminReportsService({ repo });
  const out = await svc.review('r1', { action: 'remove' }, 'adm1');
  assert.deepStrictEqual(out, { id: 'r1', action: 'remove', resolved: 3 });
  assert.strictEqual(received.action, 'remove');
  assert.strictEqual(received.reviewedBy, 'adm1');
  assert.strictEqual(received.report.rideId, 'ride1');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminCityStringsService } = require('../adminCityStrings.service');

const ROW_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CITY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ROW = { id: ROW_ID, rawText: 'amballa', occurrenceCount: 3, createdAt: new Date(), suggestedCity: { id: CITY_ID, canonicalName: 'Ambala' } };

function fakeRepo(overrides = {}) {
  const calls = { resolveTx: [], markReviewed: [], cityExists: [] };
  const repo = {
    async listQueue() { return { rows: [ROW], total: 1 }; },
    async findUnreviewed(id) { return id === ROW_ID ? ROW : null; },
    async cityExists(id) { calls.cityExists.push(id); return id === CITY_ID; },
    async resolveTx(id, cityId, rawText) { calls.resolveTx.push([id, cityId, rawText]); },
    async markReviewed(id) { calls.markReviewed.push(id); },
    ...overrides,
  };
  return { repo, calls };
}

test('list returns the queue rows + paging meta', async () => {
  const { repo } = fakeRepo();
  const svc = createAdminCityStringsService({ repo });
  const out = await svc.list({ page: 1, limit: 20 });
  assert.strictEqual(out.total, 1);
  assert.strictEqual(out.items[0].rawText, 'amballa');
  assert.strictEqual(out.items[0].suggestedCity.canonicalName, 'Ambala');
});

test('act(resolve) verifies the city then writes the alias + marks reviewed', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminCityStringsService({ repo });
  await svc.act(ROW_ID, { action: 'resolve', cityId: CITY_ID });
  assert.deepStrictEqual(calls.cityExists, [CITY_ID]);
  assert.deepStrictEqual(calls.resolveTx[0], [ROW_ID, CITY_ID, 'amballa']);
});

test('act(resolve) on a duplicate alias (P2002) still marks the row reviewed', async () => {
  const err = Object.assign(new Error('unique'), { code: 'P2002' });
  const { repo, calls } = fakeRepo({ async resolveTx() { throw err; } });
  const svc = createAdminCityStringsService({ repo });
  await svc.act(ROW_ID, { action: 'resolve', cityId: CITY_ID });
  assert.deepStrictEqual(calls.markReviewed, [ROW_ID]);
});

test('act(resolve) rethrows a non-P2002 error', async () => {
  const err = Object.assign(new Error('boom'), { code: 'P2003' });
  const { repo } = fakeRepo({ async resolveTx() { throw err; } });
  const svc = createAdminCityStringsService({ repo });
  await assert.rejects(() => svc.act(ROW_ID, { action: 'resolve', cityId: CITY_ID }), /boom/);
});

test('act(resolve) with an unknown city → NOT_FOUND (no alias written)', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminCityStringsService({ repo });
  await assert.rejects(() => svc.act(ROW_ID, { action: 'resolve', cityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc' }), /NOT_FOUND|not found/i);
  assert.strictEqual(calls.resolveTx.length, 0);
});

test('act(dismiss) marks reviewed without touching aliases', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminCityStringsService({ repo });
  await svc.act(ROW_ID, { action: 'dismiss' });
  assert.deepStrictEqual(calls.markReviewed, [ROW_ID]);
  assert.strictEqual(calls.resolveTx.length, 0);
});

test('act on a missing/already-reviewed row → NOT_FOUND', async () => {
  const { repo } = fakeRepo();
  const svc = createAdminCityStringsService({ repo });
  await assert.rejects(() => svc.act('missing', { action: 'dismiss' }), /NOT_FOUND|not found/i);
});

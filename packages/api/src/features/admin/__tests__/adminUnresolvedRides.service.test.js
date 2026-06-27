'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminUnresolvedRidesService } = require('../adminUnresolvedRides.service');

const RIDE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CITY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const UNKNOWN_CITY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
// Pickup is resolved, drop is the missing side.
const ROW = { id: RIDE_ID, pickupCityId: CITY_ID, dropCityId: null };

function fakeRepo(overrides = {}) {
  const calls = { setCity: [], hide: [], cityExists: [] };
  const repo = {
    async listQueue() { return { rows: [{ id: RIDE_ID, displayText: 'x', dropRaw: 'amballa' }], total: 1 }; },
    async findActionable(id) { return id === RIDE_ID ? { ...ROW } : null; },
    async cityExists(id) { calls.cityExists.push(id); return id === CITY_ID; },
    async setCity(id, field, cityId) { calls.setCity.push([id, field, cityId]); },
    async hide(id) { calls.hide.push(id); },
    ...overrides,
  };
  return { repo, calls };
}

test('list returns the queue rows + paging meta', async () => {
  const { repo } = fakeRepo();
  const svc = createAdminUnresolvedRidesService({ repo });
  const out = await svc.list({ page: 1, limit: 20 });
  assert.strictEqual(out.total, 1);
  assert.strictEqual(out.items[0].dropRaw, 'amballa');
});

test('act(set_city) on the missing side verifies the city then writes the FK', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminUnresolvedRidesService({ repo });
  await svc.act(RIDE_ID, { action: 'set_city', side: 'drop', cityId: CITY_ID });
  assert.deepStrictEqual(calls.cityExists, [CITY_ID]);
  assert.deepStrictEqual(calls.setCity[0], [RIDE_ID, 'dropCityId', CITY_ID]);
});

test('act(set_city) on an already-resolved side → NOT_FOUND (never overwrites a good city)', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminUnresolvedRidesService({ repo });
  await assert.rejects(() => svc.act(RIDE_ID, { action: 'set_city', side: 'pickup', cityId: CITY_ID }), /NOT_FOUND|not found/i);
  assert.strictEqual(calls.setCity.length, 0);
});

test('act(set_city) with an unknown city → NOT_FOUND (no FK written)', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminUnresolvedRidesService({ repo });
  await assert.rejects(() => svc.act(RIDE_ID, { action: 'set_city', side: 'drop', cityId: UNKNOWN_CITY }), /NOT_FOUND|not found/i);
  assert.strictEqual(calls.setCity.length, 0);
});

test('act(hide) takes the ride down without touching cities', async () => {
  const { repo, calls } = fakeRepo();
  const svc = createAdminUnresolvedRidesService({ repo });
  await svc.act(RIDE_ID, { action: 'hide' });
  assert.deepStrictEqual(calls.hide, [RIDE_ID]);
  assert.strictEqual(calls.setCity.length, 0);
});

test('act on a missing/already-clean ride → NOT_FOUND', async () => {
  const { repo } = fakeRepo();
  const svc = createAdminUnresolvedRidesService({ repo });
  await assert.rejects(() => svc.act('missing', { action: 'hide' }), /NOT_FOUND|not found/i);
});

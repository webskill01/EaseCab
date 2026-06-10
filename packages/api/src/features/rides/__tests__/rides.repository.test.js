'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createRidesRepository, PUBLIC_RIDE_SELECT } = require('../rides.repository');

/** A prisma double that records the args it was called with. */
function fakePrisma(returns = {}) {
  const calls = {};
  return {
    calls,
    ride: {
      findMany: async (args) => { calls.findMany = args; return returns.findMany ?? []; },
      findUnique: async (args) => { calls.rideFindUnique = args; return returns.rideFindUnique ?? null; },
    },
    subscription: {
      findUnique: async (args) => { calls.subFindUnique = args; return returns.subFindUnique ?? null; },
    },
    rideContact: {
      upsert: async (args) => { calls.upsert = args; return returns.upsert ?? { contactedAt: new Date(0) }; },
    },
  };
}

test('PUBLIC_RIDE_SELECT never exposes phoneNumber or rawText', () => {
  assert.strictEqual('phoneNumber' in PUBLIC_RIDE_SELECT, false);
  assert.strictEqual('rawText' in PUBLIC_RIDE_SELECT, false);
  assert.strictEqual(PUBLIC_RIDE_SELECT.displayText, true);
});

test('PUBLIC_RIDE_SELECT joins only the canonical name of each city relation', () => {
  assert.deepStrictEqual(PUBLIC_RIDE_SELECT.pickupCity, { select: { canonicalName: true } });
  assert.deepStrictEqual(PUBLIC_RIDE_SELECT.dropCity, { select: { canonicalName: true } });
});

test('listVisibleRides filters to visible+unexpired, orders newest-first, fetches limit+1', async () => {
  const prisma = fakePrisma();
  const repo = createRidesRepository({ prisma });
  await repo.listVisibleRides({ limit: 20 });
  const a = prisma.calls.findMany;
  assert.deepStrictEqual(a.where.status, { in: ['fresh', 'booked'] });
  assert.ok(a.where.expiresAt.gt instanceof Date);
  assert.deepStrictEqual(a.orderBy, [{ receivedAt: 'desc' }, { id: 'desc' }]);
  assert.strictEqual(a.take, 21);
  assert.strictEqual(a.select, PUBLIC_RIDE_SELECT);
  assert.strictEqual('OR' in a.where, false); // no cursor -> no keyset clause
});

test('listVisibleRides adds the keyset OR clause only when a cursor is given', async () => {
  const prisma = fakePrisma();
  const repo = createRidesRepository({ prisma });
  const receivedAt = new Date('2026-06-01T10:00:00.000Z');
  await repo.listVisibleRides({ receivedAt, id: 'r1', limit: 5 });
  assert.deepStrictEqual(prisma.calls.findMany.where.OR, [
    { receivedAt: { lt: receivedAt } },
    { receivedAt, id: { lt: 'r1' } },
  ]);
  assert.strictEqual(prisma.calls.findMany.take, 6);
});

test('listVisibleRides with cityId only filters pickup OR drop touching the city (no cursor)', async () => {
  const prisma = fakePrisma();
  const repo = createRidesRepository({ prisma });
  await repo.listVisibleRides({ cityId: 'c-uuid', limit: 10 });
  assert.deepStrictEqual(prisma.calls.findMany.where.OR, [
    { pickupCityId: 'c-uuid' },
    { dropCityId: 'c-uuid' },
  ]);
  assert.strictEqual('AND' in prisma.calls.findMany.where, false);
});

test('listVisibleRides with BOTH cursor + cityId AND-combines the two OR clauses', async () => {
  const prisma = fakePrisma();
  const repo = createRidesRepository({ prisma });
  const receivedAt = new Date('2026-06-01T10:00:00.000Z');
  await repo.listVisibleRides({ receivedAt, id: 'r1', cityId: 'c-uuid', limit: 5 });
  const w = prisma.calls.findMany.where;
  assert.strictEqual('OR' in w, false); // collapsed into AND so neither clause leaks the other
  assert.deepStrictEqual(w.AND, [
    { OR: [{ receivedAt: { lt: receivedAt } }, { receivedAt, id: { lt: 'r1' } }] },
    { OR: [{ pickupCityId: 'c-uuid' }, { dropCityId: 'c-uuid' }] },
  ]);
});

test('findPublicRideById uses the public select', async () => {
  const prisma = fakePrisma({ rideFindUnique: { id: 'r1', displayText: 'x' } });
  const repo = createRidesRepository({ prisma });
  const r = await repo.findPublicRideById('r1');
  assert.deepStrictEqual(prisma.calls.rideFindUnique, { where: { id: 'r1' }, select: PUBLIC_RIDE_SELECT });
  assert.strictEqual(r.id, 'r1');
});

test('findRideContactTarget selects only id + phoneNumber', async () => {
  const prisma = fakePrisma();
  const repo = createRidesRepository({ prisma });
  await repo.findRideContactTarget('r1');
  assert.deepStrictEqual(prisma.calls.rideFindUnique, {
    where: { id: 'r1' },
    select: { id: true, phoneNumber: true },
  });
});

test('findSubscriptionByUserId selects the gate fields by userId', async () => {
  const prisma = fakePrisma();
  // Cache miss → falls through to the DB read (§15 cache-first gate).
  const redis = { async get() { return null; }, async set() { return 'OK'; } };
  const repo = createRidesRepository({ prisma, redis });
  await repo.findSubscriptionByUserId('u1');
  assert.deepStrictEqual(prisma.calls.subFindUnique, {
    where: { userId: 'u1' },
    select: { status: true, trialExpiresAt: true, expiresAt: true },
  });
});

test('incrementContactCount namespaces under easecab:contact: with a fixed-window TTL', async () => {
  const store = new Map();
  const redis = {
    // Models FIXED_WINDOW_INCR: INCR, set TTL only when absent.
    async eval(_s, _n, key, windowSec) {
      const cur = store.get(key) || { value: 0, ttl: -1 };
      cur.value += 1;
      if (cur.ttl < 0) cur.ttl = Number(windowSec);
      store.set(key, cur);
      return cur.value;
    },
  };
  const repo = createRidesRepository({ prisma: fakePrisma(), redis });
  assert.strictEqual(await repo.incrementContactCount('u1', 60), 1);
  assert.strictEqual(await repo.incrementContactCount('u1', 60), 2);
  const key = [...store.keys()][0];
  assert.ok(key.startsWith('easecab:contact:'));
  assert.strictEqual(store.get(key).ttl, 60);
});

test('recordContact upserts on the composite unique (idempotent)', async () => {
  const prisma = fakePrisma({ upsert: { contactedAt: new Date('2026-06-01T00:00:00.000Z') } });
  const repo = createRidesRepository({ prisma });
  const out = await repo.recordContact('u1', 'r1');
  assert.deepStrictEqual(prisma.calls.upsert, {
    where: { userId_rideId: { userId: 'u1', rideId: 'r1' } },
    create: { userId: 'u1', rideId: 'r1' },
    update: {},
    select: { contactedAt: true },
  });
  assert.strictEqual(out.contactedAt.toISOString(), '2026-06-01T00:00:00.000Z');
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createPostedRidesRepository, POSTED_PUBLIC_SELECT } = require('../postedRides.repository');

function fakePrisma(over = {}) {
  return {
    postedRide: {
      async create({ data }) { return { id: 'p1', ...data }; },
      async findMany(args) { return over.findMany ? over.findMany(args) : []; },
      async findFirst(args) { return over.findFirst ? over.findFirst(args) : null; },
      async updateMany(args) { this._um = args; return { count: over.count ?? 0 }; },
    },
    city: { async findMany({ where }) { return (over.cities || []).filter((c) => where.id.in.includes(c.id)); } },
    user: { async findUnique() { return over.user ?? null; } },
    subscription: { async findUnique() { return over.sub ?? null; } },
    rideContact: { async upsert() { return { contactedAt: new Date('2026-06-02T00:00:00.000Z') }; } },
  };
}
function fakeRedis() {
  const kv = new Map();
  return {
    async eval() { return 1; },
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v) { kv.set(k, v); return 'OK'; },
    async del(k) { kv.delete(k); return 1; },
  };
}

test('createPost: converts rideTime HH:MM to a Date and persists expiresAt/postedBy', async () => {
  const repo = createPostedRidesRepository({ prisma: fakePrisma(), redis: fakeRedis() });
  const expiresAt = new Date('2026-06-03T00:00:00.000Z');
  const row = await repo.createPost({ postedBy: 'u1', fromCityRaw: 'a', toCityRaw: 'b', phone: '+919876543210', rideTime: '09:30', expiresAt });
  assert.equal(row.postedBy, 'u1');
  assert.equal(row.expiresAt, expiresAt);
  assert.ok(row.rideTime instanceof Date);
  assert.equal(row.rideTime.toISOString(), '1970-01-01T09:30:00.000Z');
});

test('findExistingCityIds: returns a Set of the ids that exist + are active', async () => {
  const repo = createPostedRidesRepository({ prisma: fakePrisma({ cities: [{ id: 'c1' }] }), redis: fakeRedis() });
  const set = await repo.findExistingCityIds(['c1', 'c2']);
  assert.equal(set.has('c1'), true);
  assert.equal(set.has('c2'), false);
});

test('closePost: updateMany scoped to owner + active; returns the count', async () => {
  const prisma = fakePrisma({ count: 1 });
  const repo = createPostedRidesRepository({ prisma, redis: fakeRedis() });
  const n = await repo.closePost('p1', 'u1');
  assert.equal(n, 1);
  assert.equal(prisma.postedRide._um.where.postedBy, 'u1');
  assert.equal(prisma.postedRide._um.where.id, 'p1');
});

test('POSTED_PUBLIC_SELECT joins the canonical + localized names of each city relation (#10), never phone', () => {
  assert.equal('phone' in POSTED_PUBLIC_SELECT, false);
  const cityNameSelect = { select: { canonicalName: true, namePa: true, nameHi: true } };
  assert.deepEqual(POSTED_PUBLIC_SELECT.fromCity, cityNameSelect);
  assert.deepEqual(POSTED_PUBLIC_SELECT.toCity, cityNameSelect);
});

test('listActivePosts: cityIds-only filters by FROM (pickup) city (no cursor)', async () => {
  let seen;
  const repo = createPostedRidesRepository({ prisma: fakePrisma({ findMany: (a) => { seen = a; return []; } }), redis: fakeRedis() });
  await repo.listActivePosts({ cityIds: ['c-uuid', 'c-uuid-2'], limit: 10 });
  assert.deepEqual(seen.where.fromCityId, { in: ['c-uuid', 'c-uuid-2'] });
  assert.equal('OR' in seen.where, false);
});

test('listActivePosts: cursor + cityIds → from field ANDs with the cursor OR', async () => {
  let seen;
  const repo = createPostedRidesRepository({ prisma: fakePrisma({ findMany: (a) => { seen = a; return []; } }), redis: fakeRedis() });
  const createdAt = new Date('2026-06-02T10:00:00.000Z');
  await repo.listActivePosts({ createdAt, id: 'p1', cityIds: ['c-uuid'], limit: 5 });
  assert.deepEqual(seen.where.fromCityId, { in: ['c-uuid'] });
  assert.deepEqual(seen.where.OR, [
    { createdAt: { lt: createdAt } },
    { createdAt, id: { lt: 'p1' } },
  ]);
});

test('findContactTarget: returns only active, unexpired posts (delegates the WHERE to prisma)', async () => {
  const target = { id: 'p1', phone: '+919876543210', postedBy: 'u9' };
  const repo = createPostedRidesRepository({ prisma: fakePrisma({ findFirst: () => target }), redis: fakeRedis() });
  assert.deepEqual(await repo.findContactTarget('p1'), target);
});

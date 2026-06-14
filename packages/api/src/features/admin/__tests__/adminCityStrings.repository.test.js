'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminCityStringsRepository } = require('../adminCityStrings.repository');

const ROW_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CITY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function fakePrisma(overrides = {}) {
  const calls = { findMany: [], count: [], findFirst: [], cityFind: [], aliasCreate: [], update: [] };
  const prisma = {
    async $transaction(arg) {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg);
    },
    unresolvedCityString: {
      async findMany(args) { calls.findMany.push(args); return [{ id: ROW_ID, rawText: 'amballa' }]; },
      async count(args) { calls.count.push(args); return 1; },
      async findFirst(args) { calls.findFirst.push(args); return args.where.id === ROW_ID ? { id: ROW_ID, rawText: 'amballa' } : null; },
      async update(args) { calls.update.push(args); return { id: args.where.id, ...args.data }; },
    },
    cityAlias: {
      async create(args) { calls.aliasCreate.push(args); return { id: 'alias-1', ...args.data }; },
    },
    city: {
      async findFirst(args) { calls.cityFind.push(args); return args.where.id === CITY_ID ? { id: CITY_ID } : null; },
    },
    ...overrides,
  };
  return { prisma, calls };
}

test('listQueue filters reviewedAt:null, orders by count then recency, paginates', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminCityStringsRepository({ prisma });
  const out = await repo.listQueue({ page: 2, limit: 20 });
  assert.deepStrictEqual(out, { rows: [{ id: ROW_ID, rawText: 'amballa' }], total: 1 });
  assert.strictEqual(calls.findMany[0].where.reviewedAt, null);
  assert.deepStrictEqual(calls.findMany[0].orderBy, [{ occurrenceCount: 'desc' }, { createdAt: 'desc' }]);
  assert.strictEqual(calls.findMany[0].skip, 20);
  assert.strictEqual(calls.findMany[0].take, 20);
  assert.ok(calls.findMany[0].select.suggestedCity);
});

test('findUnreviewed returns the row only when reviewedAt is null', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminCityStringsRepository({ prisma });
  assert.ok(await repo.findUnreviewed(ROW_ID));
  assert.strictEqual(calls.findFirst[0].where.reviewedAt, null);
  assert.strictEqual(await repo.findUnreviewed('missing'), null);
});

test('cityExists is true only for a real active city id (filters isActive)', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminCityStringsRepository({ prisma });
  assert.strictEqual(await repo.cityExists(CITY_ID), true);
  assert.strictEqual(calls.cityFind[0].where.isActive, true);
  assert.strictEqual(await repo.cityExists('nope'), false);
});

test('resolveTx creates a manual alias and marks the row reviewed in one transaction', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminCityStringsRepository({ prisma });
  await repo.resolveTx(ROW_ID, CITY_ID, 'amballa');
  assert.deepStrictEqual(calls.aliasCreate[0].data, { cityId: CITY_ID, aliasText: 'amballa', source: 'manual' });
  assert.strictEqual(calls.update[0].where.id, ROW_ID);
  assert.ok(calls.update[0].data.reviewedAt instanceof Date);
});

test('markReviewed stamps reviewedAt', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminCityStringsRepository({ prisma });
  await repo.markReviewed(ROW_ID);
  assert.strictEqual(calls.update[0].where.id, ROW_ID);
  assert.ok(calls.update[0].data.reviewedAt instanceof Date);
});

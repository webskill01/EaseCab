'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createBorderTaxRepository } = require('../borderTax.repository');

test('transition is compare-and-set: second racer loses', async () => {
  const row = { id: 'b1', status: 'filling' };
  const prisma = {
    borderTaxRequest: {
      async updateMany({ where, data }) {
        if (where.id !== row.id || !where.status.in.includes(row.status)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
  };
  const repo = createBorderTaxRepository({ prisma, redis: {} });
  assert.strictEqual(await repo.transition('b1', ['filling'], 'handed_off', { taxPaise: 23000 }), true);
  assert.strictEqual(await repo.transition('b1', ['filling'], 'cancelled'), false);
  assert.deepStrictEqual(row, { id: 'b1', status: 'handed_off', taxPaise: 23000 });
});

test('listForUser fetches limit+1 to report hasMore, cursor ANDs on (createdAt, id)', async () => {
  let seen;
  const prisma = { borderTaxRequest: { async findMany(args) { seen = args; return [{ id: 'c' }, { id: 'b' }, { id: 'a' }]; } } };
  const repo = createBorderTaxRepository({ prisma, redis: {} });
  const at = new Date('2026-11-04T10:00:00Z');
  const r = await repo.listForUser({ userId: 'u1', limit: 2, cursor: { createdAt: at, id: 'd' } });
  assert.deepStrictEqual(r, { items: [{ id: 'c' }, { id: 'b' }], hasMore: true });
  assert.strictEqual(seen.take, 3);
  assert.strictEqual(seen.where.userId, 'u1');
  assert.deepStrictEqual(seen.where.OR[1], { createdAt: at, id: { lt: 'd' } });
});

test('findActiveForVehicle excludes final statuses', async () => {
  let where;
  const prisma = { borderTaxRequest: { async findFirst(a) { where = a.where; return null; } } };
  await createBorderTaxRepository({ prisma, redis: {} }).findActiveForVehicle('PB01E9454');
  assert.ok(where.status.notIn.includes('handed_off') && where.status.notIn.includes('cancelled'));
  assert.ok(!where.status.notIn.includes('awaiting_captcha'));
});

test('hand-off is stored with the bank-timer TTL and read back as an object', async () => {
  const store = {};
  const redis = {
    async set(k, v, ex, ttl) { store[k] = { v, ex, ttl }; },
    async get(k) { return store[k]?.v ?? null; },
  };
  const repo = createBorderTaxRepository({ prisma: {}, redis });
  await repo.setHandoff('b1', { method: 'POST', action: 'https://bank', fields: [['a', '1']] });
  const [stored] = Object.values(store);
  assert.deepStrictEqual([stored.ex, stored.ttl], ['EX', 300]);
  assert.deepStrictEqual(await repo.getHandoff('b1'), { method: 'POST', action: 'https://bank', fields: [['a', '1']] });
  assert.strictEqual(await repo.getHandoff('b2'), null);
});

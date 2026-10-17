'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminUsersRepository } = require('../adminUsers.repository');

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function fakePrisma(overrides = {}) {
  const calls = { findMany: [], count: [], update: [] };
  const prisma = {
    async $transaction(arg) {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg);
    },
    user: {
      async findMany(args) { calls.findMany.push(args); return [{ id: USER_ID }]; },
      async count(args) { calls.count.push(args); return 1; },
      async findUnique({ where }) { return where.id === USER_ID ? { id: USER_ID } : null; },
      async update(args) { calls.update.push(args); return { id: args.where.id, ...args.data }; },
    },
    ...overrides,
  };
  return { prisma, calls };
}

/** The AND-ed filter fragments the repo built for the first findMany call. */
const frags = (calls) => calls.findMany[0].where.AND;

test('listUsers(active) filters isDeleted:false, paginates, returns rows+total', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  const out = await repo.listUsers({ page: 2, limit: 20, status: 'active', plan: 'all', joined: 'all' });
  assert.deepStrictEqual(out, { rows: [{ id: USER_ID }], total: 1 });
  assert.deepStrictEqual(frags(calls)[0], { isDeleted: false });
  assert.strictEqual(calls.findMany[0].skip, 20);
  assert.strictEqual(calls.findMany[0].take, 20);
  assert.deepStrictEqual(calls.count[0].where, calls.findMany[0].where);
});

test('listUsers(deleted) filters isDeleted:true; all applies no isDeleted filter', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  await repo.listUsers({ page: 1, limit: 20, status: 'deleted' });
  await repo.listUsers({ page: 1, limit: 20, status: 'all' });
  assert.deepStrictEqual(calls.findMany[0].where.AND[0], { isDeleted: true });
  assert.deepStrictEqual(calls.findMany[1].where.AND[0], {});
});

test('listUsers(q) matches phone contains OR name insensitive', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  await repo.listUsers({ page: 1, limit: 20, status: 'all', q: '98765' });
  const { OR } = frags(calls).at(-1);
  assert.deepStrictEqual(OR[0], { phone: { contains: '98765' } });
  assert.deepStrictEqual(OR[1], { name: { contains: '98765', mode: 'insensitive' } });
});

test('listUsers plan filter: active = unexpired active sub; expired = lapsed; none = never paid', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  for (const plan of ['active', 'expired', 'none']) await repo.listUsers({ page: 1, limit: 20, status: 'all', plan });
  const [active, expired, none] = calls.findMany.map((c) => c.where.AND[1]);
  assert.strictEqual(active.subscription.is.status, 'active');
  assert.ok(active.subscription.is.expiresAt.gt instanceof Date);
  assert.ok(expired.subscription.is.expiresAt.lte instanceof Date);
  assert.deepStrictEqual(none.OR, [{ subscription: { is: null } }, { subscription: { is: { expiresAt: null } } }]);
});

test('listUsers(joined=launch) keeps users from launch day 00:00 IST', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  await repo.listUsers({ page: 1, limit: 20, status: 'all', joined: 'launch' });
  assert.deepStrictEqual(frags(calls)[2], { createdAt: { gte: new Date('2026-10-14T18:30:00Z') } });
});

test('findById returns the row or null', async () => {
  const { prisma } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  assert.ok(await repo.findById(USER_ID));
  assert.strictEqual(await repo.findById('missing'), null);
});

test('setDeleted(true) stamps deletedAt; setDeleted(false) nulls it', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  await repo.setDeleted(USER_ID, true);
  assert.strictEqual(calls.update[0].data.isDeleted, true);
  assert.ok(calls.update[0].data.deletedAt instanceof Date);
  await repo.setDeleted(USER_ID, false);
  assert.strictEqual(calls.update[1].data.isDeleted, false);
  assert.strictEqual(calls.update[1].data.deletedAt, null);
});

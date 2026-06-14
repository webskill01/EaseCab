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

test('listUsers(active) filters isDeleted:false, paginates, returns rows+total', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  const out = await repo.listUsers({ page: 2, limit: 20, status: 'active' });
  assert.deepStrictEqual(out, { rows: [{ id: USER_ID }], total: 1 });
  assert.strictEqual(calls.findMany[0].where.isDeleted, false);
  assert.strictEqual(calls.findMany[0].skip, 20);
  assert.strictEqual(calls.findMany[0].take, 20);
});

test('listUsers(deleted) filters isDeleted:true', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  await repo.listUsers({ page: 1, limit: 20, status: 'deleted' });
  assert.strictEqual(calls.findMany[0].where.isDeleted, true);
});

test('listUsers(all) applies no isDeleted filter', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  await repo.listUsers({ page: 1, limit: 20, status: 'all' });
  assert.strictEqual('isDeleted' in calls.findMany[0].where, false);
});

test('listUsers(q) matches phone contains OR name insensitive', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminUsersRepository({ prisma });
  await repo.listUsers({ page: 1, limit: 20, status: 'all', q: '98765' });
  const or = calls.findMany[0].where.OR;
  assert.deepStrictEqual(or[0], { phone: { contains: '98765' } });
  assert.deepStrictEqual(or[1], { name: { contains: '98765', mode: 'insensitive' } });
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

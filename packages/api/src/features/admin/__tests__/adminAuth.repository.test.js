'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminAuthRepository } = require('../adminAuth.repository');

function fakePrisma(rows) {
  return { adminUser: {
    async findUnique({ where }) { return rows.find((r) => r.email === where.email) || null; },
    async findFirst({ where }) { return rows.find((r) => r.id === where.id) || null; },
  } };
}
function fakeRedis() {
  const m = new Map();
  return { async eval(_s, _n, k) { const c = (m.get(k) || 0) + 1; m.set(k, c); return c; } };
}

test('findAdminByEmail returns the row, null on miss', async () => {
  const repo = createAdminAuthRepository({ prisma: fakePrisma([{ id: 'a1', email: 'x@y.com' }]), redis: fakeRedis() });
  assert.strictEqual((await repo.findAdminByEmail('x@y.com')).id, 'a1');
  assert.strictEqual(await repo.findAdminByEmail('no@y.com'), null);
});

test('findAdminById returns the row, null on miss', async () => {
  const repo = createAdminAuthRepository({ prisma: fakePrisma([{ id: 'a1', email: 'x@y.com' }]), redis: fakeRedis() });
  assert.strictEqual((await repo.findAdminById('a1')).email, 'x@y.com');
  assert.strictEqual(await repo.findAdminById('nope'), null);
});

test('incrementLoginCount uses a per-email fixed window', async () => {
  const repo = createAdminAuthRepository({ prisma: fakePrisma([]), redis: fakeRedis() });
  assert.strictEqual(await repo.incrementLoginCount('x@y.com', 900), 1);
  assert.strictEqual(await repo.incrementLoginCount('x@y.com', 900), 2);
  assert.strictEqual(await repo.incrementLoginCount('other@y.com', 900), 1);
});

test('incrementLoginCountByIp uses a separate per-IP fixed window (H3)', async () => {
  const repo = createAdminAuthRepository({ prisma: fakePrisma([]), redis: fakeRedis() });
  assert.strictEqual(await repo.incrementLoginCountByIp('1.2.3.4', 900), 1);
  assert.strictEqual(await repo.incrementLoginCountByIp('1.2.3.4', 900), 2);
  assert.strictEqual(await repo.incrementLoginCountByIp('5.6.7.8', 900), 1);
  // The IP counter must not collide with the per-email counter for the same string.
  assert.strictEqual(await repo.incrementLoginCount('1.2.3.4', 900), 1);
});

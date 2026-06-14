'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAdminVerificationsRepository } = require('../adminVerifications.repository');

function fakePrisma(overrides = {}) {
  return {
    $transaction: async (arr) => Promise.all(arr),
    verificationSubmission: {
      findMany: async () => [{ id: 's1' }],
      count: async () => 1,
      findUnique: async ({ where }) => (where.id === 's1' ? { id: 's1', status: 'submitted' } : null),
      update: async ({ where, data }) => ({ id: where.id, ...data }),
      ...overrides.verificationSubmission,
    },
    user: { update: async ({ where, data }) => ({ id: where.id, ...data }), ...overrides.user },
  };
}

test('listSubmitted filters submitted DL/RC and returns rows + total', async () => {
  let captured;
  const prisma = fakePrisma({
    verificationSubmission: {
      findMany: async (args) => { captured = args; return [{ id: 's1' }]; },
      count: async () => 7,
    },
  });
  const repo = createAdminVerificationsRepository({ prisma });
  const { rows, total } = await repo.listSubmitted({ page: 2, limit: 20 });
  assert.equal(total, 7);
  assert.equal(rows.length, 1);
  assert.equal(captured.where.status, 'submitted');
  assert.deepEqual(captured.where.docType, { in: ['dl', 'rc'] });
  assert.equal(captured.skip, 20);
  assert.equal(captured.take, 20);
  assert.deepEqual(captured.orderBy, { createdAt: 'desc' });
});

test('findById delegates to findUnique', async () => {
  const repo = createAdminVerificationsRepository({ prisma: fakePrisma() });
  assert.deepEqual(await repo.findById('s1'), { id: 's1', status: 'submitted' });
  assert.equal(await repo.findById('nope'), null);
});

test('applyReview writes status + reviewer audit fields', async () => {
  const repo = createAdminVerificationsRepository({ prisma: fakePrisma() });
  const r = await repo.applyReview({ id: 's1', status: 'approved', reviewedBy: 'a1', rejectionReason: null });
  assert.equal(r.status, 'approved');
  assert.equal(r.reviewedBy, 'a1');
  assert.equal(r.rejectionReason, null);
  assert.ok(r.reviewedAt instanceof Date);
});

test('setUserBadge updates verificationStatus', async () => {
  const repo = createAdminVerificationsRepository({ prisma: fakePrisma() });
  const r = await repo.setUserBadge({ userId: 'u1', status: 'approved' });
  assert.equal(r.verificationStatus, 'approved');
});

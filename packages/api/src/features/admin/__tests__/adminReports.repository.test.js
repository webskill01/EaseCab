'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createAdminReportsRepository } = require('../adminReports.repository');

const RIDE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function fakePrisma(overrides = {}) {
  const calls = { updateMany: [], rideUpdate: [], postedUpdate: [] };
  const prisma = {
    async $transaction(arg) {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg);
    },
    rideReport: {
      async findMany() { return [{ id: 'r1' }]; },
      async count() { return 1; },
      async findUnique({ where }) { return where.id === 'r1' ? { id: 'r1', rideId: RIDE_ID, postedRideId: null } : null; },
      async updateMany(args) { calls.updateMany.push(args); return { count: 2 }; },
    },
    ride: { async update(args) { calls.rideUpdate.push(args); return {}; } },
    postedRide: { async update(args) { calls.postedUpdate.push(args); return {}; } },
    ...overrides,
  };
  return { prisma, calls };
}

test('listReports(open) filters reviewedAt:null and returns rows + total', async () => {
  const { prisma } = fakePrisma();
  const repo = createAdminReportsRepository({ prisma });
  const out = await repo.listReports({ page: 1, limit: 20, status: 'open' });
  assert.deepStrictEqual(out, { rows: [{ id: 'r1' }], total: 1 });
});

test('reviewTarget(remove) hides the bot ride and cascade-resolves siblings', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminReportsRepository({ prisma });
  const out = await repo.reviewTarget({
    report: { id: 'r1', rideId: RIDE_ID, postedRideId: null },
    action: 'remove',
    reviewedBy: 'adm1',
  });
  assert.strictEqual(out.count, 2);
  assert.deepStrictEqual(calls.rideUpdate[0].data, { status: 'hidden' });
  assert.strictEqual(calls.updateMany[0].where.rideId, RIDE_ID);
  assert.strictEqual(calls.updateMany[0].where.reviewedAt, null);
  assert.strictEqual(calls.updateMany[0].data.reviewAction, 'remove');
  assert.strictEqual(calls.postedUpdate.length, 0);
});

test('reviewTarget(dismiss) resolves siblings without touching any ride', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminReportsRepository({ prisma });
  await repo.reviewTarget({ report: { id: 'r1', rideId: RIDE_ID, postedRideId: null }, action: 'dismiss', reviewedBy: 'adm1' });
  assert.strictEqual(calls.rideUpdate.length, 0);
  assert.strictEqual(calls.updateMany[0].data.reviewAction, 'dismiss');
});

test('reviewTarget(remove) on a posted ride sets PostedRideStatus.deleted', async () => {
  const { prisma, calls } = fakePrisma();
  const repo = createAdminReportsRepository({ prisma });
  await repo.reviewTarget({
    report: { id: 'r2', rideId: null, postedRideId: 'pppppppp-pppp-pppp-pppp-pppppppppppp' },
    action: 'remove',
    reviewedBy: 'adm1',
  });
  assert.deepStrictEqual(calls.postedUpdate[0].data, { status: 'deleted' });
  assert.strictEqual(calls.updateMany[0].where.postedRideId, 'pppppppp-pppp-pppp-pppp-pppppppppppp');
});

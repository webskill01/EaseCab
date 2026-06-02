'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RIDE_STATUS } = require('@easecab/shared');
const { createRideLifecycleRepository } = require('../rideLifecycle.repository');

/**
 * Mock Prisma that records each call's args and returns a fixed count, so we can
 * assert the exact WHERE/data shapes without a live DB.
 */
function mockPrisma(counts = {}) {
  const calls = [];
  const record = (name, count) => async (args) => {
    calls.push({ name, args });
    return { count };
  };
  return {
    calls,
    ride: {
      updateMany: record('ride.updateMany', counts.rideUpdate ?? 0),
      deleteMany: record('ride.deleteMany', counts.rideDelete ?? 0),
    },
    rideFingerprint: {
      deleteMany: record('fp.deleteMany', counts.fpDelete ?? 0),
    },
    postedRide: {
      updateMany: record('postedRide.updateMany', counts.postedUpdate ?? 0),
      findMany: async (args) => { calls.push({ name: 'postedRide.findMany', args }); return counts.expiringPosts ?? []; },
    },
    chat: {
      updateMany: record('chat.updateMany', counts.chatUpdate ?? 0),
    },
  };
}

const NOW = new Date('2026-06-01T12:00:00.000Z');

test('markBooked flips fresh rides older than the cutoff to booked', async () => {
  const prisma = mockPrisma({ rideUpdate: 3 });
  const repo = createRideLifecycleRepository({ prisma });
  const cutoff = new Date('2026-06-01T11:55:00.000Z');

  const count = await repo.markBooked(cutoff);

  assert.equal(count, 3);
  const { args } = prisma.calls[0];
  assert.equal(args.where.status, RIDE_STATUS.FRESH);
  assert.deepEqual(args.where.receivedAt, { lte: cutoff });
  assert.equal(args.data.status, RIDE_STATUS.BOOKED);
});

test('markHidden hides fresh+booked rides past their feed expiry', async () => {
  const prisma = mockPrisma({ rideUpdate: 5 });
  const repo = createRideLifecycleRepository({ prisma });

  const count = await repo.markHidden(NOW);

  assert.equal(count, 5);
  const { args } = prisma.calls[0];
  assert.deepEqual(args.where.status, { in: [RIDE_STATUS.FRESH, RIDE_STATUS.BOOKED] });
  assert.deepEqual(args.where.expiresAt, { lte: NOW });
  assert.equal(args.data.status, RIDE_STATUS.HIDDEN);
});

test('hardDelete removes ride rows past dbDeleteAt regardless of status', async () => {
  const prisma = mockPrisma({ rideDelete: 2 });
  const repo = createRideLifecycleRepository({ prisma });

  const count = await repo.hardDelete(NOW);

  assert.equal(count, 2);
  const { name, args } = prisma.calls[0];
  assert.equal(name, 'ride.deleteMany');
  assert.deepEqual(args.where.dbDeleteAt, { lte: NOW });
  // never scoped by status — a 12h-old ride is deleted whatever its state
  assert.equal('status' in args.where, false);
});

test('purgeFingerprints deletes only expired fingerprints, never via ride', async () => {
  const prisma = mockPrisma({ fpDelete: 4 });
  const repo = createRideLifecycleRepository({ prisma });

  const count = await repo.purgeFingerprints(NOW);

  assert.equal(count, 4);
  const { name, args } = prisma.calls[0];
  assert.equal(name, 'fp.deleteMany');
  assert.deepEqual(args.where.expiresAt, { lte: NOW });
  // fingerprint lifetime is independent of the ride row (survives ride deletion)
  assert.equal('rideId' in args.where, false);
});

test('expirePostedRides flips expiring posts + deactivates their chats', async () => {
  const prisma = mockPrisma({ expiringPosts: [{ id: 'p1' }, { id: 'p2' }], chatUpdate: 3 });
  const repo = createRideLifecycleRepository({ prisma });

  const result = await repo.expirePostedRides(NOW);

  assert.deepEqual(result, { postedExpired: 2, chatsClosed: 3 });
  // 1) find the expiring active posts
  assert.equal(prisma.calls[0].name, 'postedRide.findMany');
  assert.equal(prisma.calls[0].args.where.status, 'active');
  assert.deepEqual(prisma.calls[0].args.where.expiresAt, { lte: NOW });
  // 2) flip those posts to expired + closed
  assert.equal(prisma.calls[1].name, 'postedRide.updateMany');
  assert.deepEqual(prisma.calls[1].args.where.id, { in: ['p1', 'p2'] });
  assert.equal(prisma.calls[1].args.data.status, 'expired');
  assert.equal(prisma.calls[1].args.data.isClosed, true);
  // 3) deactivate the chats of those posts (read-only on expiry)
  assert.equal(prisma.calls[2].name, 'chat.updateMany');
  assert.deepEqual(prisma.calls[2].args.where.postedRideId, { in: ['p1', 'p2'] });
  assert.equal(prisma.calls[2].args.where.isActive, true);
  assert.equal(prisma.calls[2].args.data.isActive, false);
});

test('expirePostedRides is a no-op (no chat write) when nothing is expiring', async () => {
  const prisma = mockPrisma({ expiringPosts: [] });
  const repo = createRideLifecycleRepository({ prisma });

  const result = await repo.expirePostedRides(NOW);

  assert.deepEqual(result, { postedExpired: 0, chatsClosed: 0 });
  assert.equal(prisma.calls.some((c) => c.name === 'chat.updateMany'), false);
});

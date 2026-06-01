'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createRideRepository } = require('../rideRepository');

function mockPrisma() {
  const calls = { create: [], fp: [], tx: 0, fpExists: null };
  const client = {
    ride: {
      create: async (a) => {
        calls.create.push(a);
        return { id: 'ride-1', ...a.data };
      },
    },
    rideFingerprint: {
      findUnique: async ({ where }) =>
        calls.fpExists === where.fingerprint ? { id: 'x' } : null,
      create: async (a) => {
        calls.fp.push(a);
        return a.data;
      },
    },
    $transaction: async (fn) => {
      calls.tx++;
      return fn(client);
    },
  };
  return { client, calls };
}

const baseRide = () => ({
  rawText: 'r',
  displayText: 'd',
  phoneNumber: '9876543210',
  fingerprint: 'fp-1',
  pickupCityId: 'c1',
  dropCityId: null,
  pickupRaw: 'delhi',
  dropRaw: null,
  vehicleType: 'Innova',
  sourceGroupId: 'g',
  sourceGroupName: 'n',
});

test('isDuplicate true when fingerprint exists', async () => {
  const { client, calls } = mockPrisma();
  calls.fpExists = 'fp-abc';
  const repo = createRideRepository({ prisma: client, redis: { publish: async () => {} } });
  assert.strictEqual(await repo.isDuplicate('fp-abc'), true);
});

test('isDuplicate false when fingerprint absent', async () => {
  const { client } = mockPrisma();
  const repo = createRideRepository({ prisma: client, redis: { publish: async () => {} } });
  assert.strictEqual(await repo.isDuplicate('fp-none'), false);
});

test('saveRide writes ride+fingerprint in a transaction then publishes', async () => {
  const { client, calls } = mockPrisma();
  const published = [];
  const repo = createRideRepository({
    prisma: client,
    redis: { publish: async (ch, msg) => published.push([ch, msg]) },
  });
  const ride = await repo.saveRide(baseRide());
  assert.strictEqual(calls.tx, 1);
  assert.strictEqual(calls.create.length, 1);
  assert.strictEqual(calls.fp.length, 1);
  assert.strictEqual(published.length, 1);
  assert.strictEqual(ride.id, 'ride-1');
});

test('saveRide computes expiresAt (30m) < dbDeleteAt (12h) and links fingerprint to ride', async () => {
  const { client, calls } = mockPrisma();
  const repo = createRideRepository({ prisma: client, redis: { publish: async () => {} } });
  const before = Date.now();
  await repo.saveRide(baseRide());
  const rideData = calls.create[0].data;
  const fpData = calls.fp[0].data;
  // 30-min feed expiry strictly before the 12h hard-delete.
  assert.ok(rideData.expiresAt.getTime() < rideData.dbDeleteAt.getTime());
  assert.ok(rideData.expiresAt.getTime() - before >= 29 * 60 * 1000);
  assert.ok(rideData.dbDeleteAt.getTime() - before >= 11 * 60 * 60 * 1000);
  // fingerprint row carries the new ride id + its own 12h expiry.
  assert.strictEqual(fpData.rideId, 'ride-1');
  assert.ok(fpData.expiresAt.getTime() > before);
});

test('saveRide publishes the ride id + cities + fresh status on RIDES_NEW_CHANNEL', async () => {
  const { client } = mockPrisma();
  const published = [];
  const repo = createRideRepository({
    prisma: client,
    redis: { publish: async (ch, msg) => published.push([ch, msg]) },
  });
  await repo.saveRide(baseRide());
  const [channel, payload] = published[0];
  assert.match(channel, /rides:new$/);
  const parsed = JSON.parse(payload);
  assert.strictEqual(parsed.id, 'ride-1');
  assert.strictEqual(parsed.pickupCityId, 'c1');
  assert.strictEqual(parsed.status, 'fresh');
});

test('saveRide still returns the ride when publish fails (non-fatal)', async () => {
  const { client } = mockPrisma();
  const warned = [];
  const repo = createRideRepository({
    prisma: client,
    redis: {
      publish: async () => {
        throw new Error('redis down');
      },
    },
    logger: { warn: (...a) => warned.push(a), info() {}, error() {} },
  });
  const ride = await repo.saveRide(baseRide());
  assert.strictEqual(ride.id, 'ride-1');
  assert.strictEqual(warned.length, 1);
});

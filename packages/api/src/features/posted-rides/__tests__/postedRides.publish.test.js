'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const pino = require('pino');
const { POSTED_RIDES_NEW_CHANNEL } = require('@easecab/shared');
const { createPostedRidesRepository } = require('../postedRides.repository');
const { createPostedRidesService } = require('../postedRides.service');

const CITY_A = '11111111-1111-4111-8111-111111111111';
const CITY_B = '22222222-2222-4222-8222-222222222222';

test('repo.publishCreated publishes {id,fromCityId,toCityId} on the posted-rides channel', async () => {
  const published = [];
  const redis = { async publish(ch, msg) { published.push([ch, JSON.parse(msg)]); return 1; } };
  const repo = createPostedRidesRepository({ prisma: {}, redis });
  await repo.publishCreated({ id: 'p1', fromCityId: CITY_A, toCityId: CITY_B });
  assert.deepEqual(published[0], [POSTED_RIDES_NEW_CHANNEL, { id: 'p1', fromCityId: CITY_A, toCityId: CITY_B }]);
});

/** Minimal repo stub for the service create path. */
function fakeRepo(over = {}) {
  const calls = { published: [] };
  return {
    calls,
    async getUserKycFlags() { return { aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false }; },
    async findExistingCityIds(ids) { return new Set(ids); },
    async createPost(data) { return { id: 'p9', fromCityId: data.fromCityId ?? null, toCityId: data.toCityId ?? null, fromCityRaw: null, toCityRaw: null, vehicleType: null, fare: null, rideDate: null, rideTime: null, notes: null, status: 'active', isClosed: false, createdAt: new Date(), expiresAt: new Date() }; },
    async publishCreated(arg) { calls.published.push(arg); if (over.publishThrows) throw new Error('redis down'); },
  };
}

test('service.createPost publishes the new post after create', async () => {
  const repo = fakeRepo();
  const svc = createPostedRidesService({ repo, logger: pino({ level: 'silent' }) });
  const out = await svc.createPost('u1', { fromCityId: CITY_A, toCityId: CITY_B, phone: '+919876543210' });
  assert.equal(out.id, 'p9');
  assert.deepEqual(repo.calls.published[0], { id: 'p9', fromCityId: CITY_A, toCityId: CITY_B });
});

test('service.createPost swallows a publish failure (create still succeeds)', async () => {
  const repo = fakeRepo({ publishThrows: true });
  const svc = createPostedRidesService({ repo, logger: pino({ level: 'silent' }) });
  const out = await svc.createPost('u1', { fromCityRaw: 'Some Town', toCityRaw: 'Other Town', phone: '+919876543210' });
  assert.equal(out.id, 'p9'); // create returned despite the publish throwing
});

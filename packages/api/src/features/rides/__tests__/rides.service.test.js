'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createRidesService, toPublicRide, isSubscriptionActive } = require('../rides.service');
const { ERROR_CODES } = require('@easecab/shared');

const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

function ride(id, over = {}) {
  return {
    id,
    displayText: 'Amritsar to Delhi ████',
    pickupCityId: 'c1',
    dropCityId: 'c2',
    pickupRaw: 'amritsar',
    dropRaw: 'delhi',
    // relations the repo select joins for clean city names (T1):
    pickupCity: { canonicalName: 'Amritsar' },
    dropCity: { canonicalName: 'Delhi' },
    vehicleType: 'sedan',
    status: 'fresh',
    receivedAt: new Date('2026-06-01T10:00:00.000Z'),
    expiresAt: FUTURE,
    // intentionally include leaky fields to prove the whitelist drops them:
    phoneNumber: '+919876543210',
    rawText: 'Amritsar to Delhi +919876543210',
    ...over,
  };
}

test('toPublicRide whitelists public fields and drops phoneNumber/rawText', () => {
  const pub = toPublicRide(ride('r1'));
  assert.strictEqual('phoneNumber' in pub, false);
  assert.strictEqual('rawText' in pub, false);
  assert.deepStrictEqual(Object.keys(pub).sort(), [
    'displayText', 'dropCityId', 'dropCityName', 'dropCityNameHi', 'dropCityNamePa', 'dropRaw',
    'expiresAt', 'id', 'pickupCityId', 'pickupCityName', 'pickupCityNameHi', 'pickupCityNamePa',
    'pickupRaw', 'receivedAt', 'status', 'vehicleType',
  ]);
});

test('toPublicRide surfaces localized city names, null when the relation lacks them (#10)', () => {
  const withLoc = toPublicRide(ride('r1', {
    pickupCity: { canonicalName: 'Amritsar', namePa: 'ਅੰਮ੍ਰਿਤਸਰ', nameHi: 'अमृतसर' },
    dropCity: { canonicalName: 'Delhi' },
  }));
  assert.strictEqual(withLoc.pickupCityNamePa, 'ਅੰਮ੍ਰਿਤਸਰ');
  assert.strictEqual(withLoc.pickupCityNameHi, 'अमृतसर');
  assert.strictEqual(withLoc.dropCityNamePa, null);
  assert.strictEqual(withLoc.dropCityNameHi, null);
});

test('toPublicRide surfaces joined canonical city names, null when the relation is absent', () => {
  const named = toPublicRide(ride('r1'));
  assert.strictEqual(named.pickupCityName, 'Amritsar');
  assert.strictEqual(named.dropCityName, 'Delhi');
  // unresolved city (no relation row) → name is null, raw still carries the fragment
  const bare = toPublicRide(ride('r2', { pickupCity: null, dropCity: undefined }));
  assert.strictEqual(bare.pickupCityName, null);
  assert.strictEqual(bare.dropCityName, null);
  assert.strictEqual(bare.pickupRaw, 'amritsar');
});

test('isSubscriptionActive — gate truth table', () => {
  assert.strictEqual(isSubscriptionActive(null), false);
  assert.strictEqual(isSubscriptionActive({ status: 'trial', trialExpiresAt: FUTURE }), true);
  assert.strictEqual(isSubscriptionActive({ status: 'trial', trialExpiresAt: PAST }), false);
  assert.strictEqual(isSubscriptionActive({ status: 'active', expiresAt: FUTURE }), true);
  assert.strictEqual(isSubscriptionActive({ status: 'active', expiresAt: PAST }), false);
  assert.strictEqual(isSubscriptionActive({ status: 'active', expiresAt: null }), false);
  assert.strictEqual(isSubscriptionActive({ status: 'expired', trialExpiresAt: FUTURE, expiresAt: FUTURE }), false);
  assert.strictEqual(isSubscriptionActive({ status: 'cancelled', expiresAt: FUTURE }), false);
});

test('listFeed (no cursor) returns the masked page and no nextCursor when underfull', async () => {
  const repo = { listVisibleRides: async () => [ride('r1'), ride('r2')] };
  const svc = createRidesService({ repo });
  const out = await svc.listFeed({ limit: 20 });
  assert.strictEqual(out.rides.length, 2);
  assert.strictEqual(out.nextCursor, null);
  assert.strictEqual('phoneNumber' in out.rides[0], false);
});

test('listFeed slices to limit and emits a nextCursor when a further page exists', async () => {
  // repo returns limit+1 rows -> there is a next page.
  const repo = {
    listVisibleRides: async ({ limit }) =>
      Array.from({ length: limit + 1 }, (_, i) => ride(`r${i}`, { receivedAt: new Date(Date.now() - i * 1000) })),
  };
  const svc = createRidesService({ repo });
  const out = await svc.listFeed({ limit: 2 });
  assert.strictEqual(out.rides.length, 2);
  assert.ok(typeof out.nextCursor === 'string' && out.nextCursor.length > 0);
});

test('listFeed passes the decoded cursor key through to the repo', async () => {
  let seen;
  const repo = { listVisibleRides: async (args) => { seen = args; return []; } };
  const svc = createRidesService({ repo });
  // build a real cursor via a first page
  const { encodeCursor } = require('../../../lib/cursor');
  const cursor = encodeCursor({ receivedAt: new Date('2026-06-01T09:00:00.000Z'), id: 'r9' });
  await svc.listFeed({ limit: 5, cursor });
  assert.strictEqual(seen.id, 'r9');
  assert.strictEqual(seen.receivedAt.toISOString(), '2026-06-01T09:00:00.000Z');
});

test('listFeed forwards the optional cityId filter to the repo', async () => {
  let seen;
  const repo = { listVisibleRides: async (args) => { seen = args; return []; } };
  const svc = createRidesService({ repo });
  await svc.listFeed({ limit: 5, cityId: 'city-uuid-1' });
  assert.strictEqual(seen.cityId, 'city-uuid-1');
});

test('listFeed throws VALIDATION_ERROR on a bad cursor', async () => {
  const svc = createRidesService({ repo: { listVisibleRides: async () => [] } });
  await assert.rejects(svc.listFeed({ limit: 5, cursor: 'garbage!!!' }), (e) => e.code === ERROR_CODES.VALIDATION_ERROR);
});

test('contactRide reveals the phone + records contact when the gate passes', async () => {
  const calls = {};
  const repo = {
    findRideContactTarget: async (id) => { calls.target = id; return { id, phoneNumber: '+919876543210' }; },
    findSubscriptionByUserId: async (uid) => { calls.sub = uid; return { status: 'trial', trialExpiresAt: FUTURE }; },
    incrementContactCount: async () => 1,
    recordContact: async (uid, rid) => { calls.record = [uid, rid]; return { contactedAt: new Date('2026-06-01T00:00:00.000Z') }; },
  };
  const out = await createRidesService({ repo }).contactRide({ userId: 'u1', rideId: 'r1' });
  assert.strictEqual(out.phoneNumber, '+919876543210');
  assert.strictEqual(out.contactedAt.toISOString(), '2026-06-01T00:00:00.000Z');
  assert.deepStrictEqual(calls.record, ['u1', 'r1']);
});

test('contactRide throws NOT_FOUND for a missing ride and never consults the gate', async () => {
  let gateChecked = false;
  const repo = {
    findRideContactTarget: async () => null,
    findSubscriptionByUserId: async () => { gateChecked = true; return null; },
    incrementContactCount: async () => assert.fail('must not rate-limit a missing ride'),
    recordContact: async () => assert.fail('must not record'),
  };
  await assert.rejects(createRidesService({ repo }).contactRide({ userId: 'u1', rideId: 'gone' }), (e) => e.code === ERROR_CODES.NOT_FOUND);
  assert.strictEqual(gateChecked, false);
});

test('contactRide throws SUBSCRIPTION_EXPIRED when the gate fails (no reveal, no record)', async () => {
  const repo = {
    findRideContactTarget: async (id) => ({ id, phoneNumber: '+919876543210' }),
    findSubscriptionByUserId: async () => ({ status: 'expired' }),
    incrementContactCount: async () => assert.fail('must not rate-limit a gated-out user'),
    recordContact: async () => assert.fail('must not record on a failed gate'),
  };
  await assert.rejects(createRidesService({ repo }).contactRide({ userId: 'u1', rideId: 'r1' }), (e) => e.code === ERROR_CODES.SUBSCRIPTION_EXPIRED);
});

test('contactRide throws RATE_LIMITED past the per-user reveal cap (no record/reveal)', async () => {
  const { CONTACT_RATE_LIMIT } = require('@easecab/shared');
  const repo = {
    findRideContactTarget: async (id) => ({ id, phoneNumber: '+919876543210' }),
    findSubscriptionByUserId: async () => ({ status: 'active', expiresAt: FUTURE }),
    incrementContactCount: async () => CONTACT_RATE_LIMIT.MAX_PER_WINDOW + 1, // over the cap
    recordContact: async () => assert.fail('must not record once rate-limited'),
  };
  await assert.rejects(
    createRidesService({ repo }).contactRide({ userId: 'u1', rideId: 'r1' }),
    (e) => e.code === ERROR_CODES.RATE_LIMITED,
  );
});

test('contactRide records a bot-source snapshot (route, vehicle, revealed phone)', async () => {
  const recorded = [];
  const repo = {
    findRideContactTarget: async () => ({
      id: 'r1', phoneNumber: '+919876500000', vehicleType: 'Sedan',
      pickupRaw: 'ldh', dropRaw: null,
      pickupCity: { canonicalName: 'Ludhiana' }, dropCity: null,
    }),
    findSubscriptionByUserId: async () => ({ status: 'active', expiresAt: FUTURE, trialExpiresAt: null }),
    incrementContactCount: async () => 1,
    recordContact: async (userId, rideId, snapshot) => { recorded.push({ userId, rideId, snapshot }); return { contactedAt: new Date() }; },
  };
  const out = await createRidesService({ repo }).contactRide({ userId: 'u1', rideId: 'r1' });
  assert.strictEqual(out.phoneNumber, '+919876500000');
  assert.deepStrictEqual(recorded[0].snapshot, {
    source: 'bot', fromCityName: 'Ludhiana', toCityName: null,
    vehicleType: 'Sedan', revealedPhone: '+919876500000',
  });
});

test('reportRide writes a report when the ride exists', async () => {
  let created = null;
  const repo = {
    findRideExists: async (id) => ({ id }),
    createRideReport: async (data) => { created = data; return { id: 'rep1', createdAt: new Date() }; },
  };
  const out = await createRidesService({ repo }).reportRide({ userId: 'u1', rideId: 'r1', reason: 'spam', remarks: 'dupe' });
  assert.strictEqual(out.id, 'rep1');
  assert.deepStrictEqual(created, { reporterId: 'u1', rideId: 'r1', reason: 'spam', remarks: 'dupe', screenshotKey: null });
});

test('reportRide verifies + stores a screenshot key when supplied', async () => {
  let created = null;
  let verified = null;
  const repo = {
    findRideExists: async (id) => ({ id }),
    createRideReport: async (data) => { created = data; return { id: 'rep2', createdAt: new Date() }; },
  };
  const uploads = {
    verifyUpload: async (args) => { verified = args; return { key: args.key, publicUrl: null }; },
  };
  await createRidesService({ repo, uploads }).reportRide({ userId: 'u1', rideId: 'r1', reason: 'fake', screenshotKey: 'reports/u1/abc.jpg' });
  assert.deepStrictEqual(verified, { userId: 'u1', purpose: 'report_screenshot', key: 'reports/u1/abc.jpg' });
  assert.strictEqual(created.screenshotKey, 'reports/u1/abc.jpg');
});

test('reportRide throws NOT_FOUND for a missing ride and never writes', async () => {
  let wrote = false;
  const repo = {
    findRideExists: async () => null,
    createRideReport: async () => { wrote = true; return {}; },
  };
  await assert.rejects(
    createRidesService({ repo }).reportRide({ userId: 'u1', rideId: 'gone', reason: 'fake' }),
    (e) => e.code === ERROR_CODES.NOT_FOUND,
  );
  assert.strictEqual(wrote, false);
});

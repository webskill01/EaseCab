'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPushService } = require('../push.service');

const CITY = '11111111-1111-4111-8111-111111111111';

/** A repo stub that records calls + returns canned values. */
function fakeRepo(over = {}) {
  const calls = { register: [], remove: [], find: [], prune: [], update: [], cities: [] };
  return {
    calls,
    async registerToken(a) { calls.register.push(a); return { id: 'ps1', platform: a.platform, createdAt: new Date('2026-01-01') }; },
    async removeToken(a) { calls.remove.push(a); return over.removed ?? 1; },
    async findExistingCityIds(ids) { calls.cities.push(ids); return over.existing ?? new Set(ids); },
    async listCitiesByIds(ids) { calls.listCities = ids; return (over.cityNames ?? ids.map((id) => ({ id, name: `City-${id.slice(0, 4)}` }))); },
    async getPreferences(id) { calls.getPrefs = id; return over.prefs === undefined ? { notificationCities: [], notifyBotRides: true, notifyPostedRides: true } : over.prefs; },
    async updatePreferences(id, data) { calls.update.push([id, data]); return { notificationCities: data.notificationCities ?? [], notifyBotRides: true, notifyPostedRides: true }; },
    async findTargetTokens(a) { calls.find.push(a); return over.tokens ?? []; },
    async pruneTokens(t) { calls.prune.push(t); return t.length; },
  };
}

test('registerToken returns a public sub (no raw token echoed)', async () => {
  const repo = fakeRepo();
  const svc = createPushService({ repo });
  const out = await svc.registerToken('u1', { deviceToken: 'tok', platform: 'android' });
  assert.deepEqual(repo.calls.register[0], { userId: 'u1', deviceToken: 'tok', platform: 'android' });
  assert.equal('deviceToken' in out, false);
  assert.equal(out.platform, 'android');
});

test('unregisterToken reports the removed count', async () => {
  const svc = createPushService({ repo: fakeRepo({ removed: 1 }) });
  assert.deepEqual(await svc.unregisterToken('u1', { deviceToken: 'tok' }), { removed: 1 });
});

test('getPreferences throws NOT_FOUND when the user is gone', async () => {
  const svc = createPushService({ repo: fakeRepo({ prefs: null }) });
  await assert.rejects(svc.getPreferences('ghost'), (e) => e.code === 'NOT_FOUND');
});

test('getPreferences resolves stored city ids to {id,name} for the settings UI', async () => {
  const repo = fakeRepo({
    prefs: { notificationCities: [CITY], notifyBotRides: true, notifyPostedRides: false },
    cityNames: [{ id: CITY, name: 'Ludhiana' }],
  });
  const out = await createPushService({ repo }).getPreferences('u1');
  assert.deepEqual(out.notificationCities, [CITY]);
  assert.deepEqual(out.cities, [{ id: CITY, name: 'Ludhiana' }]);
  assert.equal(out.notifyPostedRides, false);
});

test('getPreferences returns an empty cities list without hitting the city lookup', async () => {
  const repo = fakeRepo({ prefs: { notificationCities: [], notifyBotRides: true, notifyPostedRides: true } });
  const out = await createPushService({ repo }).getPreferences('u1');
  assert.deepEqual(out.cities, []);
  assert.equal(repo.calls.listCities, undefined);
});

test('updatePreferences rejects an unknown city id with VALIDATION_ERROR', async () => {
  const repo = fakeRepo({ existing: new Set() }); // no city exists
  const svc = createPushService({ repo });
  await assert.rejects(svc.updatePreferences('u1', { notificationCities: [CITY] }), (e) => e.code === 'VALIDATION_ERROR');
});

test('updatePreferences skips the city check when no cities are supplied', async () => {
  const repo = fakeRepo();
  const svc = createPushService({ repo });
  await svc.updatePreferences('u1', { notifyBotRides: false });
  assert.equal(repo.calls.cities.length, 0); // never validated cities
  assert.deepEqual(repo.calls.update[0], ['u1', { notifyBotRides: false }]);
});

test('updatePreferences accepts a valid city list', async () => {
  const repo = fakeRepo({ existing: new Set([CITY]) });
  const out = await createPushService({ repo }).updatePreferences('u1', { notificationCities: [CITY] });
  assert.deepEqual(out.notificationCities, [CITY]);
});

test('dispatchForRide: no city ids → no send', async () => {
  const sender = { calls: [], async sendToTokens(a) { this.calls.push(a); return { successCount: 0, staleTokens: [] }; } };
  const out = await createPushService({ repo: fakeRepo(), pushSender: sender }).dispatchForRide({ source: 'bot', rideId: 'r1', cityIds: [null, undefined] });
  assert.deepEqual(out, { targeted: 0, successCount: 0, pruned: 0 });
  assert.equal(sender.calls.length, 0);
});

test('dispatchForRide: no matching tokens → no send', async () => {
  const sender = { calls: [], async sendToTokens(a) { this.calls.push(a); return { successCount: 0, staleTokens: [] }; } };
  const out = await createPushService({ repo: fakeRepo({ tokens: [] }), pushSender: sender }).dispatchForRide({ source: 'bot', rideId: 'r1', cityIds: [CITY] });
  assert.equal(out.targeted, 0);
  assert.equal(sender.calls.length, 0);
});

test('dispatchForRide: sends source-specific copy + data, dedupes cities', async () => {
  const repo = fakeRepo({ tokens: ['t1', 't2'] });
  const sender = { calls: [], async sendToTokens(a) { this.calls.push(a); return { successCount: 2, staleTokens: [] }; } };
  const out = await createPushService({ repo, pushSender: sender }).dispatchForRide({ source: 'posted', rideId: 'r9', cityIds: [CITY, CITY] });
  assert.deepEqual(repo.calls.find[0].cityIds, [CITY]); // deduped
  assert.equal(repo.calls.find[0].source, 'posted');
  const sent = sender.calls[0];
  assert.equal(sent.notification, undefined); // data-only: no notification block
  assert.deepEqual(sent.data, {
    type: 'new_ride',
    source: 'posted',
    rideId: 'r9',
    title: '✅ Verified ride mili!',
    // pickup === drop (same CITY) → single-city route prepended to the Hinglish body
    body: 'City-1111 · Verified driver ne abhi post ki — tap karke dekho aur contact karo.',
    url: '/feed',
  });
  assert.deepEqual(out, { targeted: 2, successCount: 2, pruned: 0 });
});

test('dispatchForRide: names the pickup→drop route in the body', async () => {
  const A = '22222222-2222-4222-8222-222222222222';
  const B = '33333333-3333-4333-8333-333333333333';
  const repo = fakeRepo({
    tokens: ['t1'],
    cityNames: [{ id: A, name: 'Amritsar' }, { id: B, name: 'Delhi' }],
  });
  const sender = { calls: [], async sendToTokens(a) { this.calls.push(a); return { successCount: 1, staleTokens: [] }; } };
  await createPushService({ repo, pushSender: sender }).dispatchForRide({ source: 'bot', rideId: 'r1', cityIds: [A, B] });
  assert.deepEqual(repo.calls.find[0].cityIds, [A]); // targets PICKUP only — drop (B) never triggers
  assert.match(sender.calls[0].data.body, /^Amritsar → Delhi · /);
});

test('dispatchForRide: prunes the tokens FCM reports as dead', async () => {
  const repo = fakeRepo({ tokens: ['live', 'dead'] });
  const sender = { async sendToTokens() { return { successCount: 1, staleTokens: ['dead'] }; } };
  const out = await createPushService({ repo, pushSender: sender }).dispatchForRide({ source: 'bot', rideId: 'r1', cityIds: [CITY] });
  assert.deepEqual(repo.calls.prune[0], ['dead']);
  assert.equal(out.pruned, 1);
});

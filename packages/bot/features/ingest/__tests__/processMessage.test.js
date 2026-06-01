'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createProcessMessage } = require('../processMessage');

const baseDeps = () => ({
  resolver: {
    // extractCities title-cases fragments, so the resolver sees 'Delhi'/'Chandigarh'.
    resolve: async (raw) =>
      raw === 'Delhi'
        ? { status: 'resolved', cityId: 'c-delhi', canonicalName: 'Delhi' }
        : { status: 'unresolved', cityId: null },
  },
  repository: {
    isDuplicate: async () => false,
    saveRide: async (d) => ({ id: 'ride-1', ...d }),
  },
  cityNames: ['Delhi', 'Chandigarh'],
  filters: { rideKeywords: ['to'], ignoreKeywords: ['khali'], blockedPhoneNumbers: [], blockedSenders: [] },
  logger: { info() {}, warn() {}, error() {} },
});

const msg = (over = {}) => ({
  text: 'delhi to chandigarh 9876543210',
  senderJid: 'x@s.whatsapp.net',
  groupId: 'g',
  groupName: 'n',
  ...over,
});

test('drops message from blocked sender', async () => {
  const deps = baseDeps();
  deps.filters.blockedSenders = ['9876543210'];
  const pm = createProcessMessage(deps);
  const r = await pm(msg({ senderJid: '919876543210@s.whatsapp.net' }));
  assert.strictEqual(r.saved, false);
  assert.strictEqual(r.reason, 'blocked_sender');
});

test('drops message containing a blocked number', async () => {
  const deps = baseDeps();
  deps.filters.blockedPhoneNumbers = ['9876543210'];
  const pm = createProcessMessage(deps);
  const r = await pm(msg());
  assert.strictEqual(r.saved, false);
  assert.strictEqual(r.reason, 'blocked_number');
});

test('drops a non-ride message', async () => {
  const pm = createProcessMessage(baseDeps());
  const r = await pm(msg({ text: 'good morning everyone 9876543210' }));
  assert.strictEqual(r.reason, 'not_ride');
});

test('drops message with no phone', async () => {
  const pm = createProcessMessage(baseDeps());
  const r = await pm(msg({ text: 'delhi to chandigarh kal' }));
  assert.strictEqual(r.reason, 'no_phone');
});

test('drops duplicate', async () => {
  const deps = baseDeps();
  deps.repository.isDuplicate = async () => true;
  const pm = createProcessMessage(deps);
  const r = await pm(msg());
  assert.strictEqual(r.reason, 'duplicate');
});

test('saves a valid ride with resolved pickup + masked display text', async () => {
  const pm = createProcessMessage(baseDeps());
  const r = await pm(msg());
  assert.strictEqual(r.saved, true);
  assert.strictEqual(r.ride.pickupCityId, 'c-delhi');
  assert.ok(!r.ride.displayText.includes('9876543210'));
});

test('skips when no pickup and no drop found', async () => {
  const pm = createProcessMessage(baseDeps());
  const r = await pm(msg({ text: 'need a ride somewhere to anywhere 9876543210' }));
  assert.strictEqual(r.reason, 'no_route');
});

test('saves with unresolved drop kept as raw fragment (cityId null)', async () => {
  const pm = createProcessMessage(baseDeps());
  const r = await pm(msg());
  assert.strictEqual(r.saved, true);
  // 'Chandigarh' is not 'Delhi' in the mock resolver -> unresolved -> null id, raw kept
  assert.strictEqual(r.ride.dropCityId, null);
  assert.strictEqual(r.ride.dropRaw, 'Chandigarh');
});

test('a resolver error is treated as unresolved, not a crash', async () => {
  const deps = baseDeps();
  deps.resolver.resolve = async () => {
    throw new Error('resolver boom');
  };
  const pm = createProcessMessage(deps);
  const r = await pm(msg());
  // pickup+drop both fail to resolve but raw fragments still present -> ride saved
  assert.strictEqual(r.saved, true);
  assert.strictEqual(r.ride.pickupCityId, null);
});

test('never throws — an unexpected internal error returns reason=error', async () => {
  const deps = baseDeps();
  deps.repository.saveRide = async () => {
    throw new Error('db exploded');
  };
  const pm = createProcessMessage(deps);
  const r = await pm(msg());
  assert.strictEqual(r.saved, false);
  assert.strictEqual(r.reason, 'error');
});

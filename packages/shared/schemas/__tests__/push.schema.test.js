'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  registerPushTokenSchema,
  unregisterPushTokenSchema,
  pushPreferencesSchema,
} = require('../push.schema');

const UUID = '11111111-1111-4111-8111-111111111111';

test('register: requires a non-empty token + a valid platform, rejects unknown keys', () => {
  assert.equal(registerPushTokenSchema.safeParse({ deviceToken: 'tok', platform: 'android' }).success, true);
  assert.equal(registerPushTokenSchema.safeParse({ deviceToken: '', platform: 'android' }).success, false);
  assert.equal(registerPushTokenSchema.safeParse({ deviceToken: 'tok', platform: 'symbian' }).success, false);
  assert.equal(registerPushTokenSchema.safeParse({ deviceToken: 'tok' }).success, false);
  assert.equal(registerPushTokenSchema.safeParse({ deviceToken: 'tok', platform: 'web', extra: 1 }).success, false);
});

test('register: rejects an over-long token', () => {
  assert.equal(
    registerPushTokenSchema.safeParse({ deviceToken: 'x'.repeat(4097), platform: 'ios' }).success,
    false,
  );
});

test('unregister: requires a token', () => {
  assert.equal(unregisterPushTokenSchema.safeParse({ deviceToken: 'tok' }).success, true);
  assert.equal(unregisterPushTokenSchema.safeParse({}).success, false);
});

test('preferences: accepts a city-uuid list + toggles, rejects bad uuids/over-cap/empty body', () => {
  assert.equal(pushPreferencesSchema.safeParse({ notificationCities: [UUID] }).success, true);
  assert.equal(pushPreferencesSchema.safeParse({ notifyBotRides: false }).success, true);
  assert.equal(pushPreferencesSchema.safeParse({ notifyPostedRides: true, notificationCities: [] }).success, true);
  assert.equal(pushPreferencesSchema.safeParse({ notificationCities: ['nope'] }).success, false);
  assert.equal(pushPreferencesSchema.safeParse({ notificationCities: new Array(26).fill(UUID) }).success, false);
  // empty body — PATCH must carry at least one field
  assert.equal(pushPreferencesSchema.safeParse({}).success, false);
  assert.equal(pushPreferencesSchema.safeParse({ extra: 1 }).success, false);
});

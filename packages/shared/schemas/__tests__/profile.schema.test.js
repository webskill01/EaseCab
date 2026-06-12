'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { profileUpdateSchema, imageAttachSchema } = require('../profile.schema');

test('profileUpdateSchema accepts a full valid body (dpKey optional)', () => {
  const ok = profileUpdateSchema.safeParse({
    name: 'Gurpreet', bio: 'Punjab driver', baseCity: 'Ludhiana',
    vehicleType: 'Innova', languagesSpoken: ['pa', 'hi'],
  });
  assert.strictEqual(ok.success, true);
});

test('profileUpdateSchema rejects unknown vehicleType + empty languages', () => {
  assert.strictEqual(profileUpdateSchema.safeParse({
    name: 'A', bio: 'x', baseCity: 'Ludhiana', vehicleType: 'Spaceship', languagesSpoken: ['pa'],
  }).success, false);
  assert.strictEqual(profileUpdateSchema.safeParse({
    name: 'Gurpreet', bio: 'x', baseCity: 'Ludhiana', vehicleType: 'Innova', languagesSpoken: [],
  }).success, false);
});

test('imageAttachSchema requires a known purpose + key', () => {
  assert.strictEqual(imageAttachSchema.safeParse({ purpose: 'dp', key: 'dp/u/x.jpg' }).success, true);
  assert.strictEqual(imageAttachSchema.safeParse({ purpose: 'avatar', key: 'k' }).success, false);
  assert.strictEqual(imageAttachSchema.safeParse({ purpose: 'dp', key: '' }).success, false);
});

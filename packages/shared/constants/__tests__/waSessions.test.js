'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  botPairKey, botSlotStatsKey, botSlotGroupsKey, botSlotRidesKey, botSlotLagKey, botPairShareKey, botMsgClaimKey,
  adminWaSessionAnalyticsQuerySchema,
} = require('../..');

test('session redis keys are namespaced per slot and never collide', () => {
  const keys = [
    botPairKey('wa-1'), botSlotStatsKey('wa-1'), botSlotGroupsKey('wa-1'),
    botSlotRidesKey('wa-1', 500), botSlotRidesKey('wa-1', 'all'), botPairShareKey('abc'), botSlotLagKey('wa-1'), botMsgClaimKey('g@g.us', 'm1'),
  ];
  keys.forEach((k) => assert.match(k, /^easecab:bot:/));
  assert.equal(new Set(keys).size, keys.length);
  assert.notEqual(botSlotRidesKey('wa-1', 500), botSlotRidesKey('wa-2', 500));
});

test('analytics period defaults to day and rejects unknown windows', () => {
  assert.equal(adminWaSessionAnalyticsQuerySchema.parse({}).period, 'day');
  assert.equal(adminWaSessionAnalyticsQuerySchema.parse({ period: 'all' }).period, 'all');
  assert.equal(adminWaSessionAnalyticsQuerySchema.safeParse({ period: 'year' }).success, false);
});

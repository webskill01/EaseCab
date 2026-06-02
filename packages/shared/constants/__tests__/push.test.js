'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { PUSH, PUSH_SOURCE, POSTED_RIDES_NEW_CHANNEL, RIDES_NEW_CHANNEL } = require('../index');

test('PUSH exposes frozen bounds + per-source copy', () => {
  assert.ok(Object.isFrozen(PUSH));
  assert.ok(Object.isFrozen(PUSH.NOTIFICATION));
  assert.ok(Object.isFrozen(PUSH.NOTIFICATION.bot));
  assert.equal(PUSH.NOTIFICATION_CITIES_MAX, 25);
  assert.equal(PUSH.TOKENS_PER_MULTICAST, 500);
  assert.equal(PUSH.DEVICE_TOKEN_MAX, 4096);
  assert.equal(PUSH.TYPE, 'new_ride');
  assert.equal(typeof PUSH.NOTIFICATION.bot.title, 'string');
  assert.equal(typeof PUSH.NOTIFICATION.posted.body, 'string');
});

test('PUSH_SOURCE is the frozen bot/posted discriminator', () => {
  assert.ok(Object.isFrozen(PUSH_SOURCE));
  assert.deepEqual(Object.values(PUSH_SOURCE).sort(), ['bot', 'posted']);
  // a source must always map to a notification copy block
  assert.ok(PUSH.NOTIFICATION[PUSH_SOURCE.BOT]);
  assert.ok(PUSH.NOTIFICATION[PUSH_SOURCE.POSTED]);
});

test('POSTED_RIDES_NEW_CHANNEL is namespaced + distinct from the bot channel', () => {
  assert.equal(POSTED_RIDES_NEW_CHANNEL, 'easecab:posted-rides:new');
  assert.notEqual(POSTED_RIDES_NEW_CHANNEL, RIDES_NEW_CHANNEL);
});

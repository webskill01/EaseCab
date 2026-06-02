'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { CHAT, FIRESTORE_PATHS } = require('../index');

test('CHAT exposes frozen message/list bounds', () => {
  assert.ok(Object.isFrozen(CHAT));
  assert.ok(Object.isFrozen(CHAT.MESSAGES));
  assert.equal(CHAT.MESSAGES.DEFAULT_LIMIT, 30);
  assert.equal(CHAT.MESSAGES.MAX_LIMIT, 50);
  assert.equal(CHAT.MINE_LIMIT, 50);
  assert.equal(CHAT.TEXT_MAX, 2000);
});

test('FIRESTORE_PATHS builds chat + message paths from the locked collection names', () => {
  assert.ok(Object.isFrozen(FIRESTORE_PATHS));
  assert.equal(FIRESTORE_PATHS.CHATS, 'chats');
  assert.equal(FIRESTORE_PATHS.MESSAGES, 'messages');
  assert.equal(FIRESTORE_PATHS.chatDoc('c1'), 'chats/c1');
  assert.equal(FIRESTORE_PATHS.messages('c1'), 'chats/c1/messages');
  assert.equal(FIRESTORE_PATHS.messageDoc('c1', 'm1'), 'chats/c1/messages/m1');
});

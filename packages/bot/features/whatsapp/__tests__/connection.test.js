'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { isIgnoredJid, isLostGroupMessage } = require('../connection');

test('isIgnoredJid: only group chats get through', () => {
  assert.strictEqual(isIgnoredJid('120363000000000000@g.us'), false);
  assert.strictEqual(isIgnoredJid('123456789012345@lid'), true);
  assert.strictEqual(isIgnoredJid('919876543210@s.whatsapp.net'), true); // own / 1:1 chat
  assert.strictEqual(isIgnoredJid('status@broadcast'), true);
  assert.strictEqual(isIgnoredJid(undefined), false);
});

test('isLostGroupMessage: a group placeholder whose body never arrived', () => {
  const lost = { key: { remoteJid: 'x@g.us' }, messageStubParameters: ['Message absent from node'] };
  assert.strictEqual(isLostGroupMessage(lost), true);
  assert.strictEqual(isLostGroupMessage({ ...lost, message: { conversation: 'hi' } }), false);
  assert.strictEqual(isLostGroupMessage({ ...lost, key: { remoteJid: 'x@s.whatsapp.net' } }), false);
  assert.strictEqual(isLostGroupMessage({ key: { remoteJid: 'x@g.us' }, messageStubParameters: ['Bad MAC'] }), false);
});

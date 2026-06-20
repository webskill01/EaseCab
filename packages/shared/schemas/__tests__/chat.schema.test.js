'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { chatOpenSchema, chatIdParamSchema, chatMessagesQuerySchema, sendMessageSchema } = require('../chat.schema');

const UUID = '11111111-1111-4111-8111-111111111111';

test('open: requires a uuid postedRideId, rejects unknown keys', () => {
  assert.equal(chatOpenSchema.safeParse({ postedRideId: UUID }).success, true);
  assert.equal(chatOpenSchema.safeParse({ postedRideId: 'nope' }).success, false);
  assert.equal(chatOpenSchema.safeParse({ postedRideId: UUID, extra: 1 }).success, false);
});

test('id param: must be a uuid', () => {
  assert.equal(chatIdParamSchema.safeParse({ id: UUID }).success, true);
  assert.equal(chatIdParamSchema.safeParse({ id: 'nope' }).success, false);
});

test('messages query: coerces limit, defaults applied, rejects out-of-range', () => {
  assert.equal(chatMessagesQuerySchema.parse({}).limit, 30);
  assert.equal(chatMessagesQuerySchema.parse({ limit: '10' }).limit, 10);
  assert.equal(chatMessagesQuerySchema.safeParse({ limit: '999' }).success, false);
  assert.equal(chatMessagesQuerySchema.safeParse({ limit: '0' }).success, false);
});

test('send: accepts a trimmed non-empty text, defaults messageType to text', () => {
  const r = sendMessageSchema.safeParse({ messageText: '  hello  ' });
  assert.equal(r.success, true);
  assert.equal(r.data.messageType, 'text');
  assert.equal(r.data.messageText, 'hello');
});

test('send: rejects empty text, over-max text, and unknown keys', () => {
  assert.equal(sendMessageSchema.safeParse({ messageText: '' }).success, false);
  assert.equal(sendMessageSchema.safeParse({ messageText: 'x'.repeat(2001) }).success, false);
  assert.equal(sendMessageSchema.safeParse({ messageText: 'hi', extra: 1 }).success, false);
});

test('send: accepts an image message with an attachmentKey and no text', () => {
  const r = sendMessageSchema.safeParse({ messageType: 'image', attachmentKey: 'chat/u1/a.jpg' });
  assert.equal(r.success, true);
  assert.equal(r.data.messageType, 'image');
  assert.equal(r.data.attachmentKey, 'chat/u1/a.jpg');
});

test('send: enforces the right field per type', () => {
  // image without a key, image with text, text with an attachment → all rejected
  assert.equal(sendMessageSchema.safeParse({ messageType: 'image' }).success, false);
  assert.equal(sendMessageSchema.safeParse({ messageType: 'image', attachmentKey: 'chat/u1/a.jpg', messageText: 'hi' }).success, false);
  assert.equal(sendMessageSchema.safeParse({ messageText: 'hi', attachmentKey: 'chat/u1/a.jpg' }).success, false);
});

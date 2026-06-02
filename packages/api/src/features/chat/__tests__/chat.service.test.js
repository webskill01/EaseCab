'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createChatService } = require('../chat.service');

/** assert.rejects validator: the thrown AppError carries the expected `.code`. */
const code = (expected) => (err) => {
  assert.equal(err.code, expected);
  return true;
};

function baseRepo(over = {}) {
  return {
    async findActivePost() { return 'post' in over ? over.post : { id: 'p1', postedBy: 'u9' }; },
    async hasContacted() { return over.contacted ?? true; },
    async openChat(args) { return { id: 'ch1', isActive: true, createdAt: new Date(), lastMessageAt: null, ...args }; },
    async getParticipantChat() { return 'chat' in over ? over.chat : { id: 'ch1' }; },
    async getWritableChat() { return 'writable' in over ? over.writable : { id: 'ch1' }; },
    async listMyChats() { return over.chats ?? []; },
    async insertMessage(args) { return { id: 'm1', messageType: 'text', sentAt: new Date('2026-06-02T10:00:00.000Z'), ...args, messageText: args.messageText }; },
    async listMessages() { return over.messages ?? []; },
  };
}

function spyStore() {
  const calls = { doc: [], msg: [] };
  return {
    calls,
    async createChatDoc(a) { calls.doc.push(a); },
    async appendMessage(a) { calls.msg.push(a); },
  };
}

test('openChat: NOT_FOUND when the posted ride is not active', async () => {
  const svc = createChatService({ repo: baseRepo({ post: null }), chatStore: spyStore() });
  await assert.rejects(() => svc.openChat('u1', { postedRideId: 'p1' }), code('NOT_FOUND'));
});

test('openChat: VALIDATION_ERROR when opening a chat on your own post', async () => {
  const svc = createChatService({ repo: baseRepo({ post: { id: 'p1', postedBy: 'u1' } }), chatStore: spyStore() });
  await assert.rejects(() => svc.openChat('u1', { postedRideId: 'p1' }), code('VALIDATION_ERROR'));
});

test('openChat: VALIDATION_ERROR when the initiator has not contacted the post', async () => {
  const svc = createChatService({ repo: baseRepo({ contacted: false }), chatStore: spyStore() });
  await assert.rejects(() => svc.openChat('u1', { postedRideId: 'p1' }), code('VALIDATION_ERROR'));
});

test('openChat: creates PG chat + Firestore doc and returns a public chat (no phone)', async () => {
  const store = spyStore();
  const svc = createChatService({ repo: baseRepo(), chatStore: store });
  const chat = await svc.openChat('u1', { postedRideId: 'p1' });
  assert.equal(chat.id, 'ch1');
  assert.equal(chat.posterId, 'u9');
  assert.equal('phone' in chat, false);
  assert.equal(store.calls.doc.length, 1);
  assert.deepEqual(store.calls.doc[0], { chatId: 'ch1', postedRideId: 'p1', posterId: 'u9', initiatorId: 'u1' });
});

test('listMessages: NOT_FOUND when the caller is not a participant', async () => {
  const svc = createChatService({ repo: baseRepo({ chat: null }), chatStore: spyStore() });
  await assert.rejects(() => svc.listMessages('u1', 'ch1', { limit: 30 }), code('NOT_FOUND'));
});

test('listMessages: returns a page + nextCursor when there is a further page', async () => {
  const messages = Array.from({ length: 3 }, (_, i) => ({ id: `m${i}`, chatId: 'ch1', senderId: 'u1', messageType: 'text', messageText: 'x', sentAt: new Date(2026, 5, 2, 10, i) }));
  const svc = createChatService({ repo: baseRepo({ messages }), chatStore: spyStore() });
  const out = await svc.listMessages('u1', 'ch1', { limit: 2 });
  assert.equal(out.messages.length, 2);
  assert.ok(out.nextCursor);
});

test('sendMessage: NOT_FOUND when the chat is read-only / not a participant', async () => {
  const svc = createChatService({ repo: baseRepo({ writable: null }), chatStore: spyStore() });
  await assert.rejects(() => svc.sendMessage('u1', 'ch1', { messageText: 'hi' }), code('NOT_FOUND'));
});

test('sendMessage: persists to PG then mirrors to Firestore, returns the public message', async () => {
  const store = spyStore();
  const svc = createChatService({ repo: baseRepo(), chatStore: store });
  const msg = await svc.sendMessage('u1', 'ch1', { messageText: 'hi' });
  assert.equal(msg.id, 'm1');
  assert.equal(msg.messageText, 'hi');
  assert.equal(store.calls.msg.length, 1);
  assert.deepEqual(store.calls.msg[0], { chatId: 'ch1', messageId: 'm1', senderId: 'u1', type: 'text', text: 'hi', sentAt: msg.sentAt });
});

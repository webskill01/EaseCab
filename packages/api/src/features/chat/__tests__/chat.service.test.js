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
    async getWritableChat() { return 'writable' in over ? over.writable : { id: 'ch1', posterId: 'u9', initiatorId: 'u1' }; },
    async isBlockedBetween() { return over.blocked ?? false; },
    async listMyChats() { return over.chats ?? []; },
    async unreadCountsByChat() { return over.unread ?? {}; },
    async markMessagesRead() { return over.markResult ?? { count: 0 }; },
    async insertMessage(args) { return { id: 'm1', messageType: 'text', sentAt: new Date('2026-06-02T10:00:00.000Z'), ...args, messageText: args.messageText }; },
    async listMessages() { return over.messages ?? []; },
  };
}

function spyStore() {
  const calls = { doc: [], msg: [], read: [], active: [] };
  return {
    calls,
    async createChatDoc(a) { calls.doc.push(a); },
    async appendMessage(a) { calls.msg.push(a); },
    async setLastRead(a) { calls.read.push(a); },
    async setLastActive(a) { calls.active.push(a); },
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

test('openChat: VALIDATION_ERROR when a block exists between the two users', async () => {
  const svc = createChatService({ repo: baseRepo({ blocked: true }), chatStore: spyStore() });
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

test('listChats: composes other-party name, route, last-message preview and unread count', async () => {
  const chats = [{
    id: 'ch1', postedRideId: 'p1', posterId: 'poster', initiatorId: 'u1',
    isActive: true, lastMessageAt: new Date('2026-06-13T01:00:00.000Z'), createdAt: new Date('2026-06-12T00:00:00.000Z'),
    initiator: { name: 'Me' }, poster: { name: 'Driver Singh', baseCity: 'Ludhiana', aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true },
    postedRide: { fromCityRaw: null, toCityRaw: null, fromCity: { canonicalName: 'Ludhiana' }, toCity: { canonicalName: 'Delhi' } },
    messages: [{ messageText: 'on my way', senderId: 'poster', sentAt: new Date('2026-06-13T01:00:00.000Z') }],
  }];
  const svc = createChatService({ repo: baseRepo({ chats, unread: { ch1: 2 } }), chatStore: spyStore() });
  const { chats: out } = await svc.listChats('u1');
  assert.equal(out[0].otherName, 'Driver Singh');
  assert.equal(out[0].otherVerified, true); // poster has all three KYC flags
  assert.equal(out[0].otherBaseCity, 'Ludhiana');
  assert.equal(out[0].fromCityName, 'Ludhiana');
  assert.equal(out[0].toCityName, 'Delhi');
  assert.equal(out[0].lastMessageText, 'on my way');
  assert.equal(out[0].unreadCount, 2);
  assert.equal(out[0].postedRideId, 'p1');
  assert.equal('phone' in out[0], false);
});

test('listChats: falls back to raw city + null preview, and shows the initiator name to the poster', async () => {
  const chats = [{
    id: 'ch2', postedRideId: 'p2', posterId: 'u1', initiatorId: 'rider',
    isActive: true, lastMessageAt: null, createdAt: new Date('2026-06-12T00:00:00.000Z'),
    initiator: { name: 'Rider Kaur', baseCity: 'Mohali', aadhaarVerified: true, dlSubmitted: false, rcSubmitted: false },
    poster: { name: 'Me' },
    postedRide: { fromCityRaw: 'Mohali', toCityRaw: 'Panchkula', fromCity: null, toCity: null },
    messages: [],
  }];
  const svc = createChatService({ repo: baseRepo({ chats }), chatStore: spyStore() });
  const { chats: out } = await svc.listChats('u1');
  assert.equal(out[0].otherName, 'Rider Kaur');
  assert.equal(out[0].otherVerified, false); // only aadhaar → not a full verified driver
  assert.equal(out[0].fromCityName, 'Mohali');
  assert.equal(out[0].lastMessageText, null);
  assert.equal(out[0].unreadCount, 0);
});

test('markRead: marks inbound read and mirrors the caller-role lastReadAt to Firestore', async () => {
  const store = spyStore();
  const svc = createChatService({ repo: baseRepo({ chat: { id: 'ch1', posterId: 'poster', initiatorId: 'u1' } }), chatStore: store });
  const res = await svc.markRead('u1', 'ch1');
  assert.ok(res.readAt instanceof Date);
  assert.equal(store.calls.read.length, 1);
  assert.equal(store.calls.read[0].role, 'initiator');
  assert.equal(store.calls.read[0].chatId, 'ch1');
});

test('markRead: resolves the poster role when the caller is the poster', async () => {
  const store = spyStore();
  const svc = createChatService({ repo: baseRepo({ chat: { id: 'ch1', posterId: 'u1', initiatorId: 'other' } }), chatStore: store });
  await svc.markRead('u1', 'ch1');
  assert.equal(store.calls.read[0].role, 'poster');
});

test('markRead: NOT_FOUND when the caller is not a participant', async () => {
  const svc = createChatService({ repo: baseRepo({ chat: null }), chatStore: spyStore() });
  await assert.rejects(() => svc.markRead('u1', 'ch1'), code('NOT_FOUND'));
});

test('touchPresence: stamps the caller-role lastActiveAt on the chat doc', async () => {
  const store = spyStore();
  const svc = createChatService({ repo: baseRepo({ chat: { id: 'ch1', posterId: 'poster', initiatorId: 'u1' } }), chatStore: store });
  const res = await svc.touchPresence('u1', 'ch1');
  assert.ok(res.activeAt instanceof Date);
  assert.equal(store.calls.active.length, 1);
  assert.equal(store.calls.active[0].role, 'initiator');
  assert.equal(store.calls.active[0].chatId, 'ch1');
});

test('touchPresence: resolves the poster role when the caller is the poster', async () => {
  const store = spyStore();
  const svc = createChatService({ repo: baseRepo({ chat: { id: 'ch1', posterId: 'u1', initiatorId: 'other' } }), chatStore: store });
  await svc.touchPresence('u1', 'ch1');
  assert.equal(store.calls.active[0].role, 'poster');
});

test('touchPresence: NOT_FOUND when the caller is not a participant', async () => {
  const svc = createChatService({ repo: baseRepo({ chat: null }), chatStore: spyStore() });
  await assert.rejects(() => svc.touchPresence('u1', 'ch1'), code('NOT_FOUND'));
});

test('sendMessage: NOT_FOUND when the chat is read-only / not a participant', async () => {
  const svc = createChatService({ repo: baseRepo({ writable: null }), chatStore: spyStore() });
  await assert.rejects(() => svc.sendMessage('u1', 'ch1', { messageText: 'hi' }), code('NOT_FOUND'));
});

test('sendMessage: NOT_FOUND when a block exists between the participants', async () => {
  const svc = createChatService({ repo: baseRepo({ blocked: true }), chatStore: spyStore() });
  await assert.rejects(() => svc.sendMessage('u1', 'ch1', { messageText: 'hi' }), code('NOT_FOUND'));
});

test('sendMessage: persists to PG then mirrors to Firestore, returns the public message', async () => {
  const store = spyStore();
  const svc = createChatService({ repo: baseRepo(), chatStore: store });
  const msg = await svc.sendMessage('u1', 'ch1', { messageText: 'hi' });
  assert.equal(msg.id, 'm1');
  assert.equal(msg.messageText, 'hi');
  assert.equal(store.calls.msg.length, 1);
  assert.deepEqual(store.calls.msg[0], { chatId: 'ch1', messageId: 'm1', senderId: 'u1', type: 'text', text: 'hi', imageUrl: null, sentAt: msg.sentAt });
});

test('sendMessage: an image verifies the key, stores the public URL, mirrors imageUrl (no text)', async () => {
  const store = spyStore();
  let verified = null;
  const uploads = { verifyUpload: async (a) => { verified = a; return { key: a.key, publicUrl: 'https://cdn/chat/u1/x.jpg' }; } };
  const svc = createChatService({ repo: baseRepo(), chatStore: store, uploads });
  const msg = await svc.sendMessage('u1', 'ch1', { messageType: 'image', attachmentKey: 'chat/u1/x.jpg' });
  assert.deepEqual(verified, { userId: 'u1', purpose: 'chat_image', key: 'chat/u1/x.jpg' });
  assert.equal(msg.attachmentUrl, 'https://cdn/chat/u1/x.jpg');
  assert.equal(msg.messageText, null);
  assert.deepEqual(store.calls.msg[0], { chatId: 'ch1', messageId: 'm1', senderId: 'u1', type: 'image', text: null, imageUrl: 'https://cdn/chat/u1/x.jpg', sentAt: msg.sentAt });
});

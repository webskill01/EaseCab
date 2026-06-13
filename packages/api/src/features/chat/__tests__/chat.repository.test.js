'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createChatRepository } = require('../chat.repository');

function fakePrisma(over = {}) {
  return {
    postedRide: {
      async findFirst(args) { this._pf = args; return over.post ?? null; },
    },
    rideContact: {
      async findUnique(args) { this._rc = args; return over.contact ?? null; },
    },
    chat: {
      async upsert(args) { this._up = args; return over.chat ?? { id: 'ch1', ...args.create }; },
      async findFirst(args) { this._ff = args; return over.chat ?? null; },
      async findMany(args) { this._fm = args; return over.chats ?? []; },
      async update(args) { this._cu = args; return {}; },
    },
    chatMessage: {
      async create(args) { this._mc = args; return { id: 'm1', sentAt: new Date('2026-06-02T10:00:00.000Z'), ...args.data }; },
      async findMany(args) { this._mf = args; return over.messages ?? []; },
      async updateMany(args) { this._mu = args; return over.unreadUpdate ?? { count: 0 }; },
      async groupBy(args) { this._mg = args; return over.unread ?? []; },
    },
    async $transaction(fn) { return fn(this); },
  };
}

test('findActivePost: scopes to active + unexpired (delegates WHERE to prisma)', async () => {
  const prisma = fakePrisma({ post: { id: 'p1', postedBy: 'u9' } });
  const repo = createChatRepository({ prisma });
  assert.deepEqual(await repo.findActivePost('p1'), { id: 'p1', postedBy: 'u9' });
  assert.equal(prisma.postedRide._pf.where.expiresAt.gt instanceof Date, true);
});

test('hasContacted: true when a RideContact row exists on (userId, postedRideId)', async () => {
  assert.equal(await createChatRepository({ prisma: fakePrisma({ contact: { id: 'rc1' } }) }).hasContacted('u1', 'p1'), true);
  assert.equal(await createChatRepository({ prisma: fakePrisma() }).hasContacted('u1', 'p1'), false);
});

test('openChat: idempotent upsert keyed on (postedRideId, initiatorId)', async () => {
  const prisma = fakePrisma();
  const repo = createChatRepository({ prisma });
  const row = await repo.openChat({ postedRideId: 'p1', posterId: 'u9', initiatorId: 'u1' });
  assert.equal(row.posterId, 'u9');
  assert.deepEqual(prisma.chat._up.where.postedRideId_initiatorId, { postedRideId: 'p1', initiatorId: 'u1' });
  assert.deepEqual(prisma.chat._up.update, {});
});

test('getParticipantChat: requires the user be initiator OR poster', async () => {
  const prisma = fakePrisma({ chat: { id: 'ch1' } });
  await createChatRepository({ prisma }).getParticipantChat('ch1', 'u1');
  assert.deepEqual(prisma.chat._ff.where.OR, [{ initiatorId: 'u1' }, { posterId: 'u1' }]);
});

test('getWritableChat: also requires the posted ride active + unexpired', async () => {
  const prisma = fakePrisma({ chat: { id: 'ch1' } });
  await createChatRepository({ prisma }).getWritableChat('ch1', 'u1');
  assert.equal(prisma.chat._ff.where.postedRide.is.status, 'active');
  assert.equal(prisma.chat._ff.where.postedRide.is.expiresAt.gt instanceof Date, true);
});

test('listMyChats: orders by lastMessageAt desc nulls-last then createdAt', async () => {
  const prisma = fakePrisma({ chats: [{ id: 'ch1' }] });
  const rows = await createChatRepository({ prisma }).listMyChats('u1', 50);
  assert.equal(rows.length, 1);
  assert.deepEqual(prisma.chat._fm.orderBy[0], { lastMessageAt: { sort: 'desc', nulls: 'last' } });
  assert.equal(prisma.chat._fm.take, 50);
});

test('listMyChats: enriches with participant names, route cities and the last message', async () => {
  const prisma = fakePrisma({ chats: [{ id: 'ch1' }] });
  await createChatRepository({ prisma }).listMyChats('u1', 50);
  const sel = prisma.chat._fm.select;
  assert.equal(sel.initiator.select.name, true);
  assert.equal(sel.poster.select.name, true);
  assert.equal(sel.postedRide.select.fromCity.select.canonicalName, true);
  assert.equal(sel.postedRide.select.toCityRaw, true);
  assert.equal(sel.messages.take, 1);
  assert.deepEqual(sel.messages.orderBy, { sentAt: 'desc' });
});

test('unreadCountsByChat: groups inbound unread messages by chat into a { id: count } map', async () => {
  const prisma = fakePrisma({ unread: [{ chatId: 'ch1', _count: { _all: 3 } }] });
  const res = await createChatRepository({ prisma }).unreadCountsByChat({ userId: 'u1', chatIds: ['ch1', 'ch2'] });
  assert.deepEqual(res, { ch1: 3 });
  assert.deepEqual(prisma.chatMessage._mg.where, { chatId: { in: ['ch1', 'ch2'] }, senderId: { not: 'u1' }, readAt: null });
});

test('unreadCountsByChat: short-circuits to {} for an empty chat set', async () => {
  assert.deepEqual(await createChatRepository({ prisma: fakePrisma() }).unreadCountsByChat({ userId: 'u1', chatIds: [] }), {});
});

test('insertMessage: creates a text message and bumps lastMessageAt in one tx', async () => {
  const prisma = fakePrisma();
  const msg = await createChatRepository({ prisma }).insertMessage({ chatId: 'ch1', senderId: 'u1', messageText: 'hi' });
  assert.equal(msg.id, 'm1');
  assert.equal(prisma.chatMessage._mc.data.messageType, 'text');
  assert.equal(prisma.chat._cu.data.lastMessageAt, msg.sentAt);
});

test('markMessagesRead: marks the OTHER party inbound unread messages read at `at`', async () => {
  const prisma = fakePrisma({ unreadUpdate: { count: 2 } });
  const repo = createChatRepository({ prisma });
  const at = new Date('2026-06-13T00:00:00.000Z');
  const res = await repo.markMessagesRead({ chatId: 'ch1', readerId: 'u1', at });
  assert.deepEqual(res, { count: 2 });
  assert.deepEqual(prisma.chatMessage._mu.where, { chatId: 'ch1', senderId: { not: 'u1' }, readAt: null });
  assert.deepEqual(prisma.chatMessage._mu.data, { readAt: at });
});

test('listMessages: keyset DESC, fetches limit+1, applies cursor OR clause', async () => {
  const prisma = fakePrisma({ messages: [{ id: 'm2' }] });
  const repo = createChatRepository({ prisma });
  await repo.listMessages({ chatId: 'ch1', sentAt: new Date('2026-06-02T10:00:00.000Z'), id: 'm5', limit: 30 });
  assert.equal(prisma.chatMessage._mf.take, 31);
  assert.equal(prisma.chatMessage._mf.where.OR.length, 2);
  // no cursor → no OR clause
  await repo.listMessages({ chatId: 'ch1', limit: 30 });
  assert.equal(prisma.chatMessage._mf.where.OR, undefined);
});

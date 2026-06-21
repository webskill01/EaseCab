'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const pino = require('pino');
const { AUTH_COOKIES } = require('@easecab/shared');
const { buildApp } = require('../../../app');
const { createJwt } = require('../../../lib/jwt');

const CONFIG = {
  corsOrigins: ['http://localhost:3000'],
  cookie: { secure: false },
  jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtl: '15m', refreshTtl: '30d' },
  razorpay: { keyId: 'rzp_test_x', keySecret: 'x'.repeat(16), webhookSecret: 'w'.repeat(16) },
};
const jwt = createJwt(CONFIG.jwt);
const cookieFor = (id) => `${AUTH_COOKIES.ACCESS_TOKEN}=${jwt.signAccess({ sub: id, role: 'user' })}`;

const UUID = (n) => `${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}${n}`;
const FUTURE = new Date(Date.now() + 3_600_000);
const PAST = new Date(Date.now() - 1_000);

function project(row, select) { if (!select) return row; const o = {}; for (const k of Object.keys(select)) o[k] = row[k] ?? null; return o; }

/** In-memory prisma covering the chat access paths (posts, contacts, chats, messages). */
function fakePrisma(seed = {}) {
  const posts = new Map((seed.posts || []).map((p) => [p.id, p]));
  const chats = new Map((seed.chats || []).map((c) => [c.id, { isActive: true, lastMessageAt: null, createdAt: new Date(), ...c }]));
  const contacts = new Set(seed.contacts || []); // "userId|postedRideId"
  const messages = [...(seed.messages || [])];
  let seq = 0;
  return {
    _chats: chats, _messages: messages,
    postedRide: {
      async findFirst({ where }) {
        const p = [...posts.values()].find((x) => x.id === where.id && x.status === where.status && x.expiresAt > where.expiresAt.gt);
        return p ? { id: p.id, postedBy: p.postedBy } : null;
      },
    },
    rideContact: {
      async findUnique({ where }) {
        const { userId, postedRideId } = where.userId_postedRideId;
        return contacts.has(`${userId}|${postedRideId}`) ? { id: 'rc' } : null;
      },
    },
    // No blocks seeded in these chat-flow tests → isBlockedBetween always false.
    userBlock: { async findFirst() { return null; } },
    chat: {
      async upsert({ where, create, select }) {
        const { postedRideId, initiatorId } = where.postedRideId_initiatorId;
        let c = [...chats.values()].find((x) => x.postedRideId === postedRideId && x.initiatorId === initiatorId);
        if (!c) { c = { id: `ch${seq += 1}`, isActive: true, lastMessageAt: null, createdAt: new Date(), ...create }; chats.set(c.id, c); }
        return project(c, select);
      },
      async findFirst({ where, select }) {
        const c = chats.get(where.id);
        if (!c) return null;
        const isParticipant = where.OR.some((o) => (o.initiatorId && o.initiatorId === c.initiatorId) || (o.posterId && o.posterId === c.posterId));
        if (!isParticipant) return null;
        if (where.postedRide) { // writable check
          const p = posts.get(c.postedRideId);
          if (!p || p.status !== 'active' || p.expiresAt <= where.postedRide.is.expiresAt.gt) return null;
        }
        return project(c, select);
      },
      async findMany({ where, select }) {
        const rows = [...chats.values()].filter((c) => where.OR.some((o) => (o.initiatorId && o.initiatorId === c.initiatorId) || (o.posterId && o.posterId === c.posterId)));
        return rows.map((r) => project(r, select));
      },
      async update({ where, data }) { Object.assign(chats.get(where.id), data); return {}; },
    },
    chatMessage: {
      async create({ data, select }) { const m = { id: `m${seq += 1}`, readAt: null, sentAt: new Date(), ...data }; messages.push(m); return project(m, select); },
      async findMany({ where, take, select }) {
        let rows = messages.filter((m) => m.chatId === where.chatId);
        rows.sort((a, b) => b.sentAt - a.sentAt || (a.id < b.id ? 1 : -1));
        return rows.slice(0, take).map((r) => project(r, select));
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const m of messages) {
          if (m.chatId === where.chatId && m.senderId !== where.senderId.not && !m.readAt) { Object.assign(m, data); count += 1; }
        }
        return { count };
      },
      async groupBy({ where }) {
        const counts = {};
        for (const m of messages) {
          if (where.chatId.in.includes(m.chatId) && m.senderId !== where.senderId.not && !m.readAt) {
            counts[m.chatId] = (counts[m.chatId] || 0) + 1;
          }
        }
        return Object.entries(counts).map(([chatId, n]) => ({ chatId, _count: { _all: n } }));
      },
    },
    async $transaction(fn) { return fn(this); },
  };
}

function fakeRedis() {
  return { async eval() { return 1; }, async get() { return null; }, async set() { return 'OK'; }, async del() { return 1; } };
}

function makeApp(seed) {
  const store = { docs: [], msgs: [], reads: [], actives: [], async createChatDoc(a) { this.docs.push(a); }, async appendMessage(a) { this.msgs.push(a); }, async setLastRead(a) { this.reads.push(a); }, async setLastActive(a) { this.actives.push(a); } };
  const app = buildApp({
    prisma: fakePrisma(seed), redis: fakeRedis(), logger: pino({ level: 'silent' }), config: CONFIG,
    identity: { async verifyOtpToken() { return { phone: '+910000000000' }; } },
    subscriber: { on() {}, subscribe: async () => {}, duplicate() { return this; }, disconnect() {} },
    razorpay: { async createOrder() { return { id: 'order_x' }; } },
    surepass: {},
    chatStore: store,
    // Fake R2 boundary so the chat_image verify gate resolves a stable public URL.
    uploads: {
      isStub: true,
      async headObject() { return { exists: true, size: 1024, contentType: 'image/jpeg' }; },
      publicUrl(key) { return `https://cdn.test/${key}`; },
    },
  });
  app.locals._store = store;
  return app;
}

const activePost = (id, postedBy) => ({ id, postedBy, status: 'active', expiresAt: FUTURE, createdAt: new Date() });

test('POST /chats → 404 when the posted ride is not active', async () => {
  const app = makeApp({});
  const res = await request(app).post('/api/v1/chats').set('Cookie', cookieFor('u1')).send({ postedRideId: UUID(1) });
  assert.equal(res.status, 404);
});

test('POST /chats → 422 when the initiator has not contacted the post', async () => {
  const app = makeApp({ posts: [activePost(UUID(2), 'u9')] });
  const res = await request(app).post('/api/v1/chats').set('Cookie', cookieFor('u1')).send({ postedRideId: UUID(2) });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /chats → 201 opens a chat + writes the Firestore doc (no phone in body)', async () => {
  const app = makeApp({ posts: [activePost(UUID(3), 'u9')], contacts: [`u1|${UUID(3)}`] });
  const res = await request(app).post('/api/v1/chats').set('Cookie', cookieFor('u1')).send({ postedRideId: UUID(3) });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.posterId, 'u9');
  assert.equal(res.body.data.initiatorId, 'u1');
  assert.equal('phone' in res.body.data, false);
  assert.equal(app.locals._store.docs.length, 1);
});

test('POST /chats/:id/messages → 201 persists + mirrors to Firestore', async () => {
  const app = makeApp({ posts: [activePost(UUID(4), 'u9')], chats: [{ id: UUID('a'), postedRideId: UUID(4), posterId: 'u9', initiatorId: 'u1' }] });
  const res = await request(app).post(`/api/v1/chats/${UUID('a')}/messages`).set('Cookie', cookieFor('u1')).send({ messageText: 'hello' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.messageText, 'hello');
  assert.equal(res.body.data.messageType, 'text');
  assert.equal(app.locals._store.msgs.length, 1);
});

test('POST /chats/:id/messages → 404 when the ride has expired (read-only)', async () => {
  const app = makeApp({
    posts: [{ id: UUID(5), postedBy: 'u9', status: 'active', expiresAt: PAST, createdAt: new Date() }],
    chats: [{ id: UUID('b'), postedRideId: UUID(5), posterId: 'u9', initiatorId: 'u1' }],
  });
  const res = await request(app).post(`/api/v1/chats/${UUID('b')}/messages`).set('Cookie', cookieFor('u1')).send({ messageText: 'late' });
  assert.equal(res.status, 404);
});

test('POST /chats/:id/messages → 422 rejects an image message with no attachmentKey', async () => {
  const app = makeApp({ posts: [activePost(UUID(6), 'u9')], chats: [{ id: UUID('c'), postedRideId: UUID(6), posterId: 'u9', initiatorId: 'u1' }] });
  const res = await request(app).post(`/api/v1/chats/${UUID('c')}/messages`).set('Cookie', cookieFor('u1')).send({ messageType: 'image' });
  assert.equal(res.status, 422);
});

test('POST /chats/:id/messages → 201 persists an image (verified key → public URL) + mirrors imageUrl', async () => {
  const app = makeApp({ posts: [activePost(UUID(6), 'u9')], chats: [{ id: UUID('c'), postedRideId: UUID(6), posterId: 'u9', initiatorId: 'u1' }] });
  const key = 'chat/u1/abc.jpg';
  const res = await request(app).post(`/api/v1/chats/${UUID('c')}/messages`).set('Cookie', cookieFor('u1')).send({ messageType: 'image', attachmentKey: key });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.messageType, 'image');
  assert.equal(res.body.data.attachmentUrl, `https://cdn.test/${key}`);
  assert.equal(res.body.data.messageText, null);
  assert.equal(app.locals._store.msgs[0].imageUrl, `https://cdn.test/${key}`);
});

test('GET /chats/:id/messages → 404 for a non-participant', async () => {
  const app = makeApp({ chats: [{ id: UUID('d'), postedRideId: UUID(7), posterId: 'u9', initiatorId: 'u2' }] });
  const res = await request(app).get(`/api/v1/chats/${UUID('d')}/messages`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 404);
});

test('GET /chats → lists the caller chats; messages history returns sent message', async () => {
  const app = makeApp({ posts: [activePost(UUID(8), 'u9')], chats: [{ id: UUID('e'), postedRideId: UUID(8), posterId: 'u9', initiatorId: 'u1' }] });
  await request(app).post(`/api/v1/chats/${UUID('e')}/messages`).set('Cookie', cookieFor('u1')).send({ messageText: 'hi there' });
  const list = await request(app).get('/api/v1/chats').set('Cookie', cookieFor('u1'));
  assert.equal(list.status, 200);
  assert.equal(list.body.data.chats.length, 1);
  const hist = await request(app).get(`/api/v1/chats/${UUID('e')}/messages`).set('Cookie', cookieFor('u9'));
  assert.equal(hist.status, 200);
  assert.equal(hist.body.data.messages[0].messageText, 'hi there');
});

test('POST /chats/:id/read → 201 clears the caller unread count + mirrors lastReadAt', async () => {
  const app = makeApp({ posts: [activePost(UUID(9), 'u9')], chats: [{ id: UUID('f'), postedRideId: UUID(9), posterId: 'u9', initiatorId: 'u1' }] });
  // poster u9 sends → initiator u1 now has 1 inbound unread.
  await request(app).post(`/api/v1/chats/${UUID('f')}/messages`).set('Cookie', cookieFor('u9')).send({ messageText: 'yo' });
  let list = await request(app).get('/api/v1/chats').set('Cookie', cookieFor('u1'));
  assert.equal(list.body.data.chats[0].unreadCount, 1);
  // u1 marks the thread read.
  const read = await request(app).post(`/api/v1/chats/${UUID('f')}/read`).set('Cookie', cookieFor('u1'));
  assert.equal(read.status, 201);
  assert.equal(app.locals._store.reads[0].role, 'initiator');
  list = await request(app).get('/api/v1/chats').set('Cookie', cookieFor('u1'));
  assert.equal(list.body.data.chats[0].unreadCount, 0);
});

test('POST /chats/:id/read → 404 for a non-participant', async () => {
  const app = makeApp({ chats: [{ id: UUID(2), postedRideId: UUID(7), posterId: 'u9', initiatorId: 'u2' }] });
  const res = await request(app).post(`/api/v1/chats/${UUID(2)}/read`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 404);
});

test('POST /chats/:id/presence → 201 stamps the caller-role lastActiveAt', async () => {
  const app = makeApp({ chats: [{ id: UUID('f'), postedRideId: UUID(9), posterId: 'u9', initiatorId: 'u1' }] });
  const res = await request(app).post(`/api/v1/chats/${UUID('f')}/presence`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 201);
  assert.equal(app.locals._store.actives[0].role, 'initiator');
  assert.equal(app.locals._store.actives[0].chatId, UUID('f'));
});

test('POST /chats/:id/presence → 404 for a non-participant', async () => {
  const app = makeApp({ chats: [{ id: UUID(2), postedRideId: UUID(7), posterId: 'u9', initiatorId: 'u2' }] });
  const res = await request(app).post(`/api/v1/chats/${UUID(2)}/presence`).set('Cookie', cookieFor('u1'));
  assert.equal(res.status, 404);
});

test('POST /chats/:id/presence → 401 without auth', async () => {
  const res = await request(makeApp({})).post(`/api/v1/chats/${UUID('f')}/presence`);
  assert.equal(res.status, 401);
});

test('unauthenticated → 401 on the chat list', async () => {
  const res = await request(makeApp({})).get('/api/v1/chats');
  assert.equal(res.status, 401);
});

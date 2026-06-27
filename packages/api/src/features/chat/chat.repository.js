'use strict';

const { POSTED_RIDE_STATUS, MESSAGE_TYPE, redisKey } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');

/** Chat columns that may reach a client — no PII (the participants are user ids). */
const CHAT_SELECT = Object.freeze({
  id: true,
  postedRideId: true,
  posterId: true,
  initiatorId: true,
  isActive: true,
  lastMessageAt: true,
  createdAt: true,
});

/**
 * Enriched columns for the chat-list screen (Step 22): bare chat fields + each
 * participant's display name, the posted ride's route cities, and the single most
 * recent message (for the preview). The service composes the other-party view from
 * this per the caller. No PII beyond the name the user set on their own profile.
 */
const CHAT_LIST_SELECT = Object.freeze({
  id: true, postedRideId: true, posterId: true, initiatorId: true,
  isActive: true, lastMessageAt: true, createdAt: true,
  // Name + base city + KYC flags → the list/header verified shield + subtitle (P12-4a).
  initiator: { select: { name: true, baseCity: true, aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true } },
  poster: { select: { name: true, baseCity: true, aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true } },
  postedRide: {
    select: {
      fromCityRaw: true, toCityRaw: true,
      fromCity: { select: { canonicalName: true } },
      toCity: { select: { canonicalName: true } },
    },
  },
  messages: { orderBy: { sentAt: 'desc' }, take: 1, select: { messageText: true, senderId: true, sentAt: true } },
});

/** Message columns that may reach a client (readAt is surfaced via tick state, not here). */
const MESSAGE_SELECT = Object.freeze({
  id: true,
  chatId: true,
  senderId: true,
  messageType: true,
  messageText: true,
  attachmentUrl: true,
  sentAt: true,
});

/**
 * Chat data access (CLAUDE.md §4 — Prisma only). Chat is 1:1 per (postedRide,
 * initiator); the API is the sole writer to both Postgres (here) and Firestore
 * (the injected chat store in the service). Writability is derived from the
 * posted ride's live status so it is correct between cron ticks.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis - backs the per-sender write rate limits (M2)
 */
function createChatRepository({ prisma, redis }) {
  const messageRateKey = (userId) => redisKey('chatmsg', userId);
  const presenceRateKey = (userId) => redisKey('chatpresence', userId);
  return {
    /** Per-sender fixed-window message counter (anti-spam, M2). Returns new count. */
    async incrMessageCount(userId, windowSec) {
      return fixedWindowIncr(redis, messageRateKey(userId), windowSec);
    },

    /** Per-sender fixed-window presence-heartbeat counter (anti-flood, M2). Returns new count. */
    async incrPresenceCount(userId, windowSec) {
      return fixedWindowIncr(redis, presenceRateKey(userId), windowSec);
    },

    /** The active, unexpired posted ride + its owner, for the open gate. null if gone. */
    async findActivePost(postedRideId) {
      return prisma.postedRide.findFirst({
        where: { id: postedRideId, status: POSTED_RIDE_STATUS.ACTIVE, expiresAt: { gt: new Date() } },
        select: { id: true, postedBy: true },
      });
    },

    /** True if either user has blocked the other (P12-4c, block is enforced both ways). */
    async isBlockedBetween(userA, userB) {
      const row = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userA, blockedId: userB },
            { blockerId: userB, blockedId: userA },
          ],
        },
        select: { id: true },
      });
      return row !== null;
    },

    /** Has this user already contacted this posted ride? (the "verified contact" gate.) */
    async hasContacted(userId, postedRideId) {
      const row = await prisma.rideContact.findUnique({
        where: { userId_postedRideId: { userId, postedRideId } },
        select: { id: true },
      });
      return row !== null;
    },

    /** Idempotently open the 1:1 chat; a re-open returns the existing row. */
    async openChat({ postedRideId, posterId, initiatorId }) {
      return prisma.chat.upsert({
        where: { postedRideId_initiatorId: { postedRideId, initiatorId } },
        create: { postedRideId, posterId, initiatorId },
        update: {},
        select: CHAT_SELECT,
      });
    },

    /** A chat the user participates in (initiator OR poster). null otherwise. */
    async getParticipantChat(chatId, userId) {
      return prisma.chat.findFirst({
        where: { id: chatId, OR: [{ initiatorId: userId }, { posterId: userId }] },
        select: CHAT_SELECT,
      });
    },

    /** The user's chats (either role), most recent activity first; no-message chats last. */
    async listMyChats(userId, limit) {
      return prisma.chat.findMany({
        where: { OR: [{ initiatorId: userId }, { posterId: userId }] },
        orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        take: limit,
        select: CHAT_LIST_SELECT,
      });
    },

    /**
     * Inbound-unread counts for a set of chats, as a `{ [chatId]: count }` map (Step
     * 22). One groupBy over the caller's unread inbound messages avoids an N+1 per
     * chat row. Empty input short-circuits (Prisma rejects an empty `in`).
     */
    async unreadCountsByChat({ userId, chatIds }) {
      if (chatIds.length === 0) return {};
      const rows = await prisma.chatMessage.groupBy({
        by: ['chatId'],
        where: { chatId: { in: chatIds }, senderId: { not: userId }, readAt: null },
        _count: { _all: true },
      });
      return Object.fromEntries(rows.map((r) => [r.chatId, r._count._all]));
    },

    /**
     * A chat the user may write to right now: they participate AND the posted ride
     * is still active + unexpired (authoritative — independent of cron lag). null if
     * not a participant or the ride has expired/closed (read-only).
     */
    async getWritableChat(chatId, userId) {
      return prisma.chat.findFirst({
        where: {
          id: chatId,
          OR: [{ initiatorId: userId }, { posterId: userId }],
          postedRide: { is: { status: POSTED_RIDE_STATUS.ACTIVE, expiresAt: { gt: new Date() } } },
        },
        select: { id: true, posterId: true, initiatorId: true },
      });
    },

    /**
     * Mark the other party's unread messages in a chat as read at `at` (read
     * receipts, Step 22). Only inbound rows (senderId ≠ reader) that are still
     * unread are touched. Returns Prisma's `{ count }`.
     */
    async markMessagesRead({ chatId, readerId, at }) {
      return prisma.chatMessage.updateMany({
        where: { chatId, senderId: { not: readerId }, readAt: null },
        data: { readAt: at },
      });
    },

    /** Insert a text message + bump the chat's lastMessageAt, atomically. */
    async insertMessage({ chatId, senderId, messageType = MESSAGE_TYPE.TEXT, messageText = null, attachmentUrl = null }) {
      return prisma.$transaction(async (tx) => {
        const msg = await tx.chatMessage.create({
          data: { chatId, senderId, messageType, messageText, attachmentUrl },
          select: MESSAGE_SELECT,
        });
        await tx.chat.update({ where: { id: chatId }, data: { lastMessageAt: msg.sentAt } });
        return msg;
      });
    },

    /**
     * One keyset page of a chat's messages, newest first. Fetches limit+1 so the
     * service can detect a further page. Cursor excludes everything at/before
     * (sentAt, id) in (sentAt DESC, id DESC) order.
     */
    async listMessages({ chatId, sentAt, id, limit }) {
      const where = { chatId };
      if (sentAt && id) {
        where.OR = [{ sentAt: { lt: sentAt } }, { sentAt, id: { lt: id } }];
      }
      return prisma.chatMessage.findMany({
        where,
        orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: MESSAGE_SELECT,
      });
    },
  };
}

module.exports = { createChatRepository, CHAT_SELECT, MESSAGE_SELECT };

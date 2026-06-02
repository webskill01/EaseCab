'use strict';

const { POSTED_RIDE_STATUS, MESSAGE_TYPE } = require('@easecab/shared');

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

/** Message columns that may reach a client. attachmentUrl/readAt deferred (Step 22). */
const MESSAGE_SELECT = Object.freeze({
  id: true,
  chatId: true,
  senderId: true,
  messageType: true,
  messageText: true,
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
 */
function createChatRepository({ prisma }) {
  return {
    /** The active, unexpired posted ride + its owner, for the open gate. null if gone. */
    async findActivePost(postedRideId) {
      return prisma.postedRide.findFirst({
        where: { id: postedRideId, status: POSTED_RIDE_STATUS.ACTIVE, expiresAt: { gt: new Date() } },
        select: { id: true, postedBy: true },
      });
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
        select: CHAT_SELECT,
      });
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
        select: { id: true },
      });
    },

    /** Insert a text message + bump the chat's lastMessageAt, atomically. */
    async insertMessage({ chatId, senderId, messageText }) {
      return prisma.$transaction(async (tx) => {
        const msg = await tx.chatMessage.create({
          data: { chatId, senderId, messageType: MESSAGE_TYPE.TEXT, messageText },
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

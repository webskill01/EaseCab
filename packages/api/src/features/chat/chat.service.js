'use strict';

const { AppError, ERROR_CODES, CHAT, MESSAGE_TYPE } = require('@easecab/shared');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');

/** Client-safe chat projection — participants are user ids; no PII. */
function toPublicChat(c) {
  return {
    id: c.id,
    postedRideId: c.postedRideId,
    posterId: c.posterId,
    initiatorId: c.initiatorId,
    isActive: c.isActive,
    lastMessageAt: c.lastMessageAt ?? null,
    createdAt: c.createdAt,
  };
}

/** Client-safe message projection. */
function toPublicMessage(m) {
  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    messageType: m.messageType,
    messageText: m.messageText ?? null,
    sentAt: m.sentAt,
  };
}

/**
 * Chat business logic (CLAUDE.md §4). The API is the sole writer: a send persists
 * to Postgres (durable source of truth) AND mirrors to Firestore (realtime) via the
 * injected chat store. Chat is "1:1 per verified ride contact" — opening requires
 * the initiator to already hold a RideContact for the post (the subscription gate
 * was passed at contact time). Read-only on ride expiry is enforced here (writable
 * is derived from the post's live status) and reconciled in bulk by the cron.
 *
 * @param {object} deps
 * @param {ReturnType<import('./chat.repository').createChatRepository>} deps.repo
 * @param {{ createChatDoc: Function, appendMessage: Function }} deps.chatStore
 */
function createChatService({ repo, chatStore }) {
  return {
    /** Open (or return) the 1:1 chat for a posted ride, behind the verified-contact gate. */
    async openChat(initiatorId, { postedRideId }) {
      const post = await repo.findActivePost(postedRideId);
      if (!post) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      if (post.postedBy === initiatorId) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR); // can't chat with your own post
      }
      const contacted = await repo.hasContacted(initiatorId, postedRideId);
      if (!contacted) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR); // must contact before chatting
      }
      const chat = await repo.openChat({ postedRideId, posterId: post.postedBy, initiatorId });
      await chatStore.createChatDoc({
        chatId: chat.id,
        postedRideId,
        posterId: post.postedBy,
        initiatorId,
      });
      return toPublicChat(chat);
    },

    /** The caller's chats (either role), most recent activity first. */
    async listChats(userId) {
      const rows = await repo.listMyChats(userId, CHAT.MINE_LIMIT);
      return { chats: rows.map(toPublicChat) };
    },

    /** One page of a chat's message history. Participant-gated. */
    async listMessages(userId, chatId, { limit, cursor }) {
      const chat = await repo.getParticipantChat(chatId, userId);
      if (!chat) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listMessages({ chatId, sentAt: key.receivedAt, id: key.id, limit });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      const nextCursor = hasMore ? encodeCursor({ receivedAt: last.sentAt, id: last.id }) : null;
      return { messages: page.map(toPublicMessage), nextCursor };
    },

    /**
     * Send a text message. NOT_FOUND if the caller isn't a participant OR the chat
     * is read-only (ride expired/closed). Postgres first (durable), then Firestore
     * (realtime mirror).
     */
    async sendMessage(userId, chatId, { messageText }) {
      const writable = await repo.getWritableChat(chatId, userId);
      if (!writable) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const msg = await repo.insertMessage({ chatId, senderId: userId, messageText });
      await chatStore.appendMessage({
        chatId,
        messageId: msg.id,
        senderId: userId,
        type: MESSAGE_TYPE.TEXT,
        text: messageText,
        sentAt: msg.sentAt,
      });
      return toPublicMessage(msg);
    },
  };
}

module.exports = { createChatService, toPublicChat, toPublicMessage };

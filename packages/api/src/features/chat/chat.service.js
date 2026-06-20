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

/** Resolved city display name: canonical (joined) wins, else the raw free-text. */
const cityName = (c, raw) => (c && c.canonicalName) || raw || null;

/**
 * Compose the enriched chat-list row a client renders (Step 22): the OTHER party's
 * name, the posted ride's route, the last-message preview, and the inbound-unread
 * count. No PII beyond the name the participant set on their own profile.
 */
function toChatListItem(c, userId, unread) {
  const amPoster = c.posterId === userId;
  const last = c.messages && c.messages[0];
  const other = amPoster ? c.initiator : c.poster;
  return {
    id: c.id,
    postedRideId: c.postedRideId,
    isActive: c.isActive,
    otherName: (other && other.name) ?? null,
    // Verified-driver shield + base-city subtitle for the chat list/header (P12-4a).
    otherVerified: Boolean(other && other.aadhaarVerified && other.dlSubmitted && other.rcSubmitted),
    otherBaseCity: (other && other.baseCity) ?? null,
    fromCityName: cityName(c.postedRide && c.postedRide.fromCity, c.postedRide && c.postedRide.fromCityRaw),
    toCityName: cityName(c.postedRide && c.postedRide.toCity, c.postedRide && c.postedRide.toCityRaw),
    lastMessageText: (last && last.messageText) ?? null,
    lastMessageAt: c.lastMessageAt ?? null,
    unreadCount: unread ?? 0,
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
    attachmentUrl: m.attachmentUrl ?? null,
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
 * @param {{ verifyUpload: Function }} [deps.uploads] - R2 verify gate (image messages)
 */
function createChatService({ repo, chatStore, uploads }) {
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
      if (await repo.isBlockedBetween(initiatorId, post.postedBy)) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR); // a block (either way) bars the chat
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

    /**
     * The caller's chats (either role), most recent activity first, each enriched
     * with the other-party name, route, last-message preview and unread count. The
     * unread counts are fetched in a single grouped query (no N+1).
     */
    async listChats(userId) {
      const rows = await repo.listMyChats(userId, CHAT.MINE_LIMIT);
      const unread = await repo.unreadCountsByChat({ userId, chatIds: rows.map((r) => r.id) });
      return { chats: rows.map((r) => toChatListItem(r, userId, unread[r.id])) };
    },

    /**
     * Mark the caller's inbound messages in a chat read (read receipts), then mirror
     * their role's lastReadAt onto the Firestore chat doc so the OTHER party's
     * subscribed thread flips its ticks live. NOT_FOUND if not a participant.
     */
    async markRead(userId, chatId) {
      const chat = await repo.getParticipantChat(chatId, userId);
      if (!chat) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const at = new Date();
      await repo.markMessagesRead({ chatId, readerId: userId, at });
      const role = chat.posterId === userId ? 'poster' : 'initiator';
      await chatStore.setLastRead({ chatId, role, at });
      return { readAt: at };
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
     * Send a text OR image message. NOT_FOUND if the caller isn't a participant OR the
     * chat is read-only (ride expired/closed). An image carries an `attachmentKey` from
     * a `chat_image` upload, re-verified here (owner/size/MIME) → stored as a stable
     * public URL. Postgres first (durable), then Firestore (realtime mirror).
     */
    async sendMessage(userId, chatId, { messageType = MESSAGE_TYPE.TEXT, messageText, attachmentKey }) {
      const writable = await repo.getWritableChat(chatId, userId);
      if (!writable) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      // A block (either direction) makes the chat unwritable — same NOT_FOUND as read-only.
      const other = writable.posterId === userId ? writable.initiatorId : writable.posterId;
      if (await repo.isBlockedBetween(userId, other)) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const isImage = messageType === MESSAGE_TYPE.IMAGE;
      const attachmentUrl = isImage
        ? (await uploads.verifyUpload({ userId, purpose: 'chat_image', key: attachmentKey })).publicUrl
        : null;
      const msg = await repo.insertMessage({
        chatId,
        senderId: userId,
        messageType,
        messageText: isImage ? null : messageText,
        attachmentUrl,
      });
      await chatStore.appendMessage({
        chatId,
        messageId: msg.id,
        senderId: userId,
        type: messageType,
        text: isImage ? null : messageText,
        imageUrl: attachmentUrl,
        sentAt: msg.sentAt,
      });
      return toPublicMessage(msg);
    },
  };
}

module.exports = { createChatService, toPublicChat, toPublicMessage, toChatListItem };

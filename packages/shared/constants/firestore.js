'use strict';

/**
 * Firestore collection/document path strings (CLAUDE.md §12 — never hardcode a
 * path inline). The API (Admin SDK) is the sole writer; clients subscribe to
 * these paths read-only for realtime. Chat messages live in a `messages`
 * subcollection under each chat doc, keyed by the same UUIDs as the Postgres
 * mirror so the two stay 1:1.
 */
const FIRESTORE_PATHS = Object.freeze({
  CHATS: 'chats',
  MESSAGES: 'messages',
  /** `chats/{chatId}` */
  chatDoc: (chatId) => `chats/${chatId}`,
  /** `chats/{chatId}/messages` */
  messages: (chatId) => `chats/${chatId}/messages`,
  /** `chats/{chatId}/messages/{messageId}` */
  messageDoc: (chatId, messageId) => `chats/${chatId}/messages/${messageId}`,
});

module.exports = { FIRESTORE_PATHS };

'use strict';

const admin = require('firebase-admin');
const { FIRESTORE_PATHS } = require('@easecab/shared');

/**
 * The Firestore vendor boundary for chat (Step 14) — mirrors lib/firebaseAdmin.js.
 * The chat service depends ONLY on the returned interface, never on Firestore
 * directly, so the realtime transport can be swapped without touching business
 * logic. The API is the sole writer (Admin SDK); clients subscribe to these paths
 * read-only. Postgres is the durable source of truth — these writes are the
 * realtime mirror.
 *
 * A named app ('easecab-chat') keeps this init independent of the 'easecab-auth'
 * app (lib/firebaseAdmin.js) and a future FCM app (Step 15) — no "app already
 * exists" clash. Live I/O — coverage-excluded (.c8rc), exercised by VPS integration.
 *
 * @param {{ projectId: string, clientEmail: string, privateKey: string }} creds
 * @returns {{
 *   createChatDoc(args: { chatId: string, postedRideId: string, posterId: string, initiatorId: string }): Promise<void>,
 *   appendMessage(args: { chatId: string, messageId: string, senderId: string, type: string, text: string|null, imageUrl: string|null, sentAt: Date }): Promise<void>,
 *   setLastRead(args: { chatId: string, role: 'initiator' | 'poster', at: Date }): Promise<void>,
 *   setLastActive(args: { chatId: string, role: 'initiator' | 'poster', at: Date }): Promise<void>
 * }}
 */
function createChatStore({ projectId, clientEmail, privateKey }) {
  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // .env stores the PEM with literal "\n"; restore real newlines for the SDK.
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  }, 'easecab-chat');
  const db = admin.firestore(app);

  return {
    /** Create the chat doc clients subscribe to. Merge so a re-open is idempotent. */
    async createChatDoc({ chatId, postedRideId, posterId, initiatorId }) {
      await db.doc(FIRESTORE_PATHS.chatDoc(chatId)).set(
        { postedRideId, posterId, initiatorId, isActive: true, createdAt: new Date() },
        { merge: true },
      );
    },

    /** Append a message under the chat, keyed by the same UUID as the PG row. An image
     *  message carries `imageUrl` (stable public R2 URL) instead of `text`. */
    async appendMessage({ chatId, messageId, senderId, type, text, imageUrl, sentAt }) {
      await db.doc(FIRESTORE_PATHS.messageDoc(chatId, messageId)).set({
        senderId,
        type,
        text: text ?? null,
        imageUrl: imageUrl ?? null,
        sentAt,
      });
    },

    /**
     * Stamp a participant's last-read time on the chat doc (Step 22 read receipts)
     * so the OTHER party's subscribed thread can flip its sent→read ticks live. One
     * field per role keeps it a single merge write.
     */
    async setLastRead({ chatId, role, at }) {
      const field = role === 'poster' ? 'posterLastReadAt' : 'initiatorLastReadAt';
      await db.doc(FIRESTORE_PATHS.chatDoc(chatId)).set({ [field]: at }, { merge: true });
    },

    /**
     * Stamp a participant's last-active time on the chat doc (P12-8 presence) so the
     * OTHER party's subscribed thread can render online / last-seen live. One field
     * per role, same single-merge-write shape as setLastRead.
     */
    async setLastActive({ chatId, role, at }) {
      const field = role === 'poster' ? 'posterLastActiveAt' : 'initiatorLastActiveAt';
      await db.doc(FIRESTORE_PATHS.chatDoc(chatId)).set({ [field]: at }, { merge: true });
    },
  };
}

module.exports = { createChatStore };

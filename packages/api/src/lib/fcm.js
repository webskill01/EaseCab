'use strict';

const admin = require('firebase-admin');
const { PUSH } = require('@easecab/shared');

/** FCM error codes that mean a token is permanently dead → prune it. */
function isStaleTokenError(err) {
  const code = err && err.code;
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument';
}

/**
 * The FCM vendor boundary (Step 15) — mirrors lib/firestoreChat.js. The push
 * service depends ONLY on the returned interface, never on firebase-admin directly,
 * so the transport can be swapped without touching business logic.
 *
 * A named app ('easecab-fcm') keeps this init independent of 'easecab-auth'
 * (firebaseAdmin) and 'easecab-chat' (firestoreChat) — no "app already exists"
 * clash. Live I/O — coverage-excluded (.c8rc); exercised once real device tokens
 * exist (frontend permission flow, Step 23).
 *
 * @param {{ projectId: string, clientEmail: string, privateKey: string }} creds
 * @returns {{ sendToTokens(args: {
 *   tokens: string[],
 *   data: Record<string, string|number>,
 * }): Promise<{ successCount: number, staleTokens: string[] }> }}
 */
function createPushSender({ projectId, clientEmail, privateKey }) {
  const app = admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // .env stores the PEM with literal "\n"; restore real newlines for the SDK.
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    },
    'easecab-fcm',
  );
  const messaging = admin.messaging(app);

  return {
    /**
     * Send one DATA-ONLY message to many device tokens, chunked to FCM's multicast
     * cap. Data-only (no `notification` field) is deliberate: on web it stops FCM from
     * auto-rendering a second, icon-less notification — the service worker's
     * onBackgroundMessage is the sole renderer. Returns the success count + the tokens
     * FCM reported as permanently invalid so the caller can prune them. Never throws
     * per token.
     */
    async sendToTokens({ tokens, data }) {
      // FCM data values must all be strings.
      const stringData = Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, String(v)]),
      );
      let successCount = 0;
      const staleTokens = [];
      for (let i = 0; i < tokens.length; i += PUSH.TOKENS_PER_MULTICAST) {
        const batch = tokens.slice(i, i + PUSH.TOKENS_PER_MULTICAST);
        const res = await messaging.sendEachForMulticast({ tokens: batch, data: stringData });
        successCount += res.successCount;
        res.responses.forEach((r, idx) => {
          if (!r.success && isStaleTokenError(r.error)) staleTokens.push(batch[idx]);
        });
      }
      return { successCount, staleTokens };
    },
  };
}

module.exports = { createPushSender };

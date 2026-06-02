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
 *   notification: { title: string, body: string },
 *   data?: Record<string, string|number>,
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
     * Send one notification to many device tokens, chunked to FCM's multicast cap.
     * Returns the success count + the tokens FCM reported as permanently invalid so
     * the caller can prune them. A per-token failure never throws.
     */
    async sendToTokens({ tokens, notification, data }) {
      // FCM data values must all be strings.
      const stringData = data
        ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        : undefined;
      let successCount = 0;
      const staleTokens = [];
      for (let i = 0; i < tokens.length; i += PUSH.TOKENS_PER_MULTICAST) {
        const batch = tokens.slice(i, i + PUSH.TOKENS_PER_MULTICAST);
        const res = await messaging.sendEachForMulticast({ tokens: batch, notification, data: stringData });
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

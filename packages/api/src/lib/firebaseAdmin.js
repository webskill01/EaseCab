'use strict';

const admin = require('firebase-admin');

/**
 * THE migration boundary (Phase 3 Step 9 decision, GOAL.md 2026-06-01). The rest
 * of auth depends only on the returned interface — `verifyOtpToken(idToken) →
 * { phone }` — never on Firebase directly. Swapping to a dedicated SMS provider
 * later means replacing ONLY this file with a new concrete that resolves the same
 * shape; JWT issuance, cookies, refresh, logout, and the rate-limit layer are
 * untouched.
 *
 * Firebase phone OTP is inherently client-side; the Admin SDK's job here is purely
 * to verify the ID token the client obtained and return the verified phone number.
 * Live I/O — coverage-excluded (.c8rc), exercised by integration on the VPS.
 *
 * @param {{ projectId: string, clientEmail: string, privateKey: string }} creds
 * @returns {{ verifyOtpToken(idToken: string): Promise<{ phone: string }>, mintCustomToken(uid: string): Promise<string> }}
 */
function createFirebaseIdentity({ projectId, clientEmail, privateKey }) {
  // Named (non-default) app so a future second init — e.g. Step 15 FCM messaging —
  // can call initializeApp with its own name without an "app already exists" clash.
  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // .env stores the PEM with literal "\n"; restore real newlines for the SDK.
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  }, 'easecab-auth');
  const auth = admin.auth(app);

  return {
    async verifyOtpToken(idToken) {
      const decoded = await auth.verifyIdToken(idToken);
      if (!decoded.phone_number) {
        throw new Error('firebase id token has no phone_number claim');
      }
      return { phone: decoded.phone_number };
    },

    /**
     * Mint a Firebase custom token whose uid == our Postgres user id, so the client
     * can sign in to Firebase and read its own chat docs/messages (Step 22). The
     * `firestore.rules` match request.auth.uid against the chat's participant ids.
     */
    async mintCustomToken(uid) {
      return auth.createCustomToken(uid);
    },
  };
}

module.exports = { createFirebaseIdentity };

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'
import { env } from '@/config/env'

/**
 * Lazy browser-only Firebase app + auth. The client migration boundary (mirrors
 * the API's lib/firebaseAdmin) — the only place the Firebase SDK is constructed.
 * Config is public by design (CLAUDE.md §3 note in config/env.js).
 */
function getFirebaseApp() {
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }
  return getApps().length ? getApp() : initializeApp(config)
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

/** Firestore handle on the same app — chat threads subscribe to it read-only (Step 22). */
export function getFirebaseFirestore() {
  return getFirestore(getFirebaseApp())
}

/** FCM messaging handle (Step 23). `null` where the browser can't do web push. */
export async function getFirebaseMessaging() {
  if (!(await isSupported())) return null
  return getMessaging(getFirebaseApp())
}

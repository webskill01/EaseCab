import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
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
  }
  return getApps().length ? getApp() : initializeApp(config)
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

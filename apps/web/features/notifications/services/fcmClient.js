import { getToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '@/features/auth/lib/firebaseClient'
import { env } from '@/config/env'

/**
 * FCM web boundary (Step 23) — mirrors otpClient/firestoreClient. In E2E mode
 * (NEXT_PUBLIC_E2E) the real SDK + OS prompts are replaced by `window.__ecFcmSeam`,
 * which the specs drive deterministically. Returns `{ permission, token }`.
 */
function swUrl() {
  const p = new URLSearchParams({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  })
  return `/firebase-messaging-sw.js?${p.toString()}`
}

export async function requestPermissionAndToken() {
  if (process.env.NEXT_PUBLIC_E2E === 'true') return window.__ecFcmSeam.requestPermissionAndToken()
  if (typeof Notification === 'undefined') return { permission: 'unsupported', token: null }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { permission, token: null }
  const messaging = await getFirebaseMessaging()
  if (!messaging) return { permission: 'unsupported', token: null }
  const reg = await navigator.serviceWorker.register(swUrl())
  const token = await getToken(messaging, {
    vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: reg,
  })
  return { permission: 'granted', token }
}

export async function onForegroundMessage(cb) {
  if (process.env.NEXT_PUBLIC_E2E === 'true') return window.__ecFcmSeam.onForegroundMessage(cb)
  const messaging = await getFirebaseMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, cb)
}

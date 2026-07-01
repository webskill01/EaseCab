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
  // Always surface the OS permission prompt FIRST so the user can grant/deny and the
  // duty-alerts toggle reflects the real permission — independent of whether a push
  // token can be minted (F1). A denial short-circuits before any FCM work.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { permission, token: null }
  // Granted, but no (or placeholder) VAPID key → FCM can't mint a web token. The SDK's
  // getToken base64url-decodes the key and throws `atob` InvalidCharacterError on a bad
  // value (the #11 smoke-test crash). Treat as "granted, no token": alerts are ON
  // app-side; push delivery simply waits for a real VAPID key. Never throws.
  const vapidKey = env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) return { permission: 'granted', token: null }
  const messaging = await getFirebaseMessaging()
  if (!messaging) return { permission: 'unsupported', token: null }
  try {
    const reg = await navigator.serviceWorker.register(swUrl(), {
      scope: '/firebase-cloud-messaging-push-scope',
      updateViaCache: 'none', // always revalidate the SW script so deployed fixes are picked up, not HTTP-cached
    })
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg })
    return { permission: 'granted', token }
  } catch {
    // Invalid VAPID key / SW registration failure / unsupported browser — notifications
    // simply stay off (the caller treats a null token as "not enabled"). Never throws.
    return { permission, token: null }
  }
}

export async function onForegroundMessage(cb) {
  if (process.env.NEXT_PUBLIC_E2E === 'true') return window.__ecFcmSeam.onForegroundMessage(cb)
  const messaging = await getFirebaseMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, cb)
}

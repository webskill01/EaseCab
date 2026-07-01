import { useEffect, useRef } from 'react'
import { requestPermissionAndToken } from '../services/fcmClient'
import { registerToken } from '../services/pushApi'
import { setStoredToken } from '../lib/pushStorage'
import { permissionState } from '../lib/pushFlow'

/**
 * Boot-time push-token sync (Step 23 recovery). The Enable button only shows when the
 * OS permission is NOT 'granted', so once a user has granted it there is no UI path to
 * re-mint a token. That strands anyone whose backend token is gone but whose permission
 * survived — a fresh install, cleared site data, a rotated FCM token. On mount, when the
 * permission is already 'granted', silently re-mint and re-register the token.
 *
 * requestPermissionAndToken also re-registers the FCM service worker, so a shipped worker
 * update propagates on the next app open (the worker's narrow scope means normal
 * navigation never update-checks it otherwise). No OS prompt fires when already granted.
 * Runs once per mount and never throws — the explicit Enable flow stays the fallback.
 */
export function useSyncPushToken() {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (permissionState() !== 'granted') return // only sync for users already opted in
    ;(async () => {
      try {
        const { token } = await requestPermissionAndToken()
        if (!token) return
        await registerToken({ deviceToken: token, platform: 'web' })
        setStoredToken(token)
      } catch {
        // best-effort: minting/register can fail on a bad VAPID key or offline — the
        // user can still re-run the explicit Enable flow.
      }
    })()
  }, [])
}

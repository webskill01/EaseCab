import { useState } from 'react'
import { requestPermissionAndToken } from '../services/fcmClient'
import { registerToken, unregisterToken } from '../services/pushApi'
import { getStoredToken, setStoredToken, clearStoredToken } from '../lib/pushStorage'

/**
 * Full "enable alerts" flow (Step 23): OS notification prompt → FCM token →
 * register + cache. The alert-city list is left untouched: it IS the feed city
 * filter, and empty = alerts for all rides (the default). Never throws.
 */
export function useEnableAlerts() {
  const [isEnabling, setIsEnabling] = useState(false)
  const [permission, setPermission] = useState(null)

  async function enable() {
    setIsEnabling(true)
    try {
      const { permission: perm, token } = await requestPermissionAndToken()
      setPermission(perm)
      if (perm !== 'granted' || !token) return { permission: perm }
      await registerToken({ deviceToken: token, platform: 'web' })
      setStoredToken(token)
      return { permission: 'granted' }
    } finally {
      setIsEnabling(false)
    }
  }

  /**
   * Turn alerts off: unregister the cached device token (best-effort) and clear it
   * locally so the master toggle reads "off". The OS-level permission can't be
   * revoked programmatically — token presence is the app-side "alerts on" signal.
   */
  async function disable() {
    const token = getStoredToken()
    if (token) {
      try { await unregisterToken({ deviceToken: token }) } catch { /* best-effort */ }
      clearStoredToken()
    }
  }

  return { enable, disable, isEnabling, permission }
}

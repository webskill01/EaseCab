'use client'

import { useRouter } from 'next/navigation'
import { logout } from '@/features/auth/services/authApi'
import { unregisterToken } from '@/features/notifications/services/pushApi'
import { getStoredToken, clearStoredToken } from '@/features/notifications/lib/pushStorage'

/**
 * Returns a logout fn: clears this device's push token, ends the session, then sends
 * the user to /login. Shared by the settings LogoutButton and the profile account card.
 */
export function useLogout() {
  const router = useRouter()
  return async function doLogout() {
    try {
      const tok = getStoredToken()
      if (tok) { await unregisterToken({ deviceToken: tok }).catch(() => {}); clearStoredToken() }
      await logout()
    } finally {
      router.replace('/login')
    }
  }
}

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { logout } from '@/features/auth/services/authApi'
import { unregisterToken } from '@/features/notifications/services/pushApi'
import { getStoredToken, clearStoredToken } from '@/features/notifications/lib/pushStorage'

/** Clears the session (and this device's push token) then sends the user to /login. */
export function LogoutButton() {
  const router = useRouter()
  const t = useTranslations('common')

  async function onLogout() {
    try {
      const tok = getStoredToken()
      if (tok) { await unregisterToken({ deviceToken: tok }).catch(() => {}); clearStoredToken() }
      await logout()
    } finally {
      router.replace('/login')
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      className="text-sm font-bold text-ec-ink60 hover:text-ec-danger"
    >
      {t('shell.logout')}
    </button>
  )
}

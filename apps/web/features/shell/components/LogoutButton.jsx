'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { logout } from '@/features/auth/services/authApi'
import { unregisterToken } from '@/features/notifications/services/pushApi'
import { getStoredToken, clearStoredToken } from '@/features/notifications/lib/pushStorage'

/**
 * Clears the session (and this device's push token) then sends the user to /login.
 * `variant="danger"` renders the red full-width button (profile, per profile.jsx,
 * #14); the default is the quiet text link (settings).
 * @param {{ variant?: 'text'|'danger' }} props
 */
export function LogoutButton({ variant = 'text' }) {
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

  if (variant === 'danger') {
    return (
      <button
        type="button"
        onClick={onLogout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-ec-danger/30 bg-ec-dangerBg text-[14.5px] font-extrabold text-ec-danger"
      >
        {t('shell.logout')}
      </button>
    )
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

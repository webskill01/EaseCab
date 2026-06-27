'use client'

import { useTranslations } from 'next-intl'
import { useLogout } from '../hooks/useLogout'

/**
 * Clears the session (and this device's push token) then sends the user to /login.
 * `variant="danger"` renders the red full-width button (profile, per profile.jsx,
 * #14); the default is the quiet text link (settings).
 * @param {{ variant?: 'text'|'danger' }} props
 */
export function LogoutButton({ variant = 'text' }) {
  const t = useTranslations('common')
  const onLogout = useLogout()

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

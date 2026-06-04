'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { logout } from '@/features/auth/services/authApi'

/** Clears the session then sends the user to /login. */
export function LogoutButton() {
  const router = useRouter()
  const t = useTranslations('common')

  async function onLogout() {
    try {
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

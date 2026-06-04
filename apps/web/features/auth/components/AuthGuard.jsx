'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { refreshSession } from '../services/authApi'

/**
 * Client-side route protection. The httpOnly cookies live on the API domain, so
 * the Next server can't read them — instead we probe POST /auth/refresh on mount
 * (which also rotates tokens). 2xx → render; any failure → replace('/login').
 * This is the 401→login wiring, identical in dev and prod.
 */
export function AuthGuard({ children }) {
  const router = useRouter()
  const t = useTranslations('auth')
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true
    refreshSession()
      .then(() => { if (active) setStatus('authed') })
      .catch(() => {
        if (!active) return
        setStatus('redirecting')
        router.replace('/login')
      })
    return () => { active = false }
  }, [router])

  if (status === 'authed') return children
  return (
    <div className="flex min-h-screen items-center justify-center text-ec-ink60">
      {t('checking')}
    </div>
  )
}

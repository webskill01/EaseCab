'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { setOnSessionExpired } from '@/lib/api/client'
import { refreshSession } from '../services/authApi'

/**
 * How often to proactively rotate the session while the app stays open. Must be
 * comfortably under the 15m access-token TTL. This keeps the SSE ride stream alive
 * too — EventSource can't replay a request the way apiFetch's 401-retry does, so it
 * relies on the access cookie never going stale underneath an open connection.
 */
export const SESSION_REFRESH_INTERVAL_MS = 12 * 60 * 1000

/**
 * Client-side route protection. The httpOnly cookies live on the API domain, so
 * the Next server can't read them — instead we probe POST /auth/refresh on mount
 * (which also rotates tokens). 2xx → render; any failure → replace('/login').
 *
 * It's a single-page app: this guard mounts once (in the (app) layout) and never
 * remounts on in-app navigation, so the one-shot mount probe is NOT enough to keep
 * a 15m token alive. While authed we also (a) refresh on an interval and (b) register
 * the global session-expired handler so a hard refresh failure bounces to /login.
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

  // Once authed: keep the session warm + wire the hard-failure redirect.
  useEffect(() => {
    if (status !== 'authed') return undefined
    const toLogin = () => router.replace('/login')
    setOnSessionExpired(toLogin)
    const id = setInterval(() => { refreshSession().catch(toLogin) }, SESSION_REFRESH_INTERVAL_MS)
    return () => {
      clearInterval(id)
      setOnSessionExpired(null)
    }
  }, [status, router])

  if (status === 'authed') return children
  return (
    <div className="flex min-h-screen items-center justify-center text-ec-ink60">
      {t('checking')}
    </div>
  )
}

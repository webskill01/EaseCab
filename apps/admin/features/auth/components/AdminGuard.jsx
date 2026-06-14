'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminMe } from '../services/adminApi'

/**
 * Client-side route protection for the admin panel. The httpOnly admin cookies live
 * on the API domain, so the Next server can't read them — instead we probe
 * GET /admin/auth/me on mount. 2xx → render; any failure → replace('/login').
 */
export function AdminGuard({ children }) {
  const router = useRouter()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true
    adminMe()
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
      Checking access…
    </div>
  )
}

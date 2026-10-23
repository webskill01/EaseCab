'use client'

import { useState } from 'react'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { useAdminLogin } from '../hooks/useAdminLogin'
import { button, input } from '@/lib/ui'

const MESSAGES = {
  AUTH_REQUIRED: 'Invalid email or password.',
  RATE_LIMITED: 'Too many attempts. Try again later.',
  NETWORK_ERROR: 'Network error. Check your connection.',
  INTERNAL_ERROR: 'Something went wrong. Try again.',
}

export function LoginForm() {
  const { submit, pending, errorKey } = useAdminLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="flex min-h-screen items-center justify-center bg-ec-bg p-4">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(email, password) }}
        className="w-full max-w-sm rounded-ec-card border border-ec-line bg-white p-6 shadow-ec-card sm:p-8"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static 192px brand icon */}
        <img src="/logo.png" alt="" className="mx-auto h-12 w-12 rounded-xl" />
        <h1 className="mt-4 text-center text-xl font-semibold tracking-tight text-ec-ink">EaseCab Admin</h1>
        <p className="mt-1 text-center text-sm text-ec-ink60">Sign in to manage the platform</p>

        <div className="mt-6 flex flex-col gap-3">
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
            <input className={`${input} h-11 pl-9`} type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
            <input className={`${input} h-11 pl-9`} type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {errorKey && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-ec-danger">
              {MESSAGES[errorKey] ?? MESSAGES.INTERNAL_ERROR}
            </p>
          )}
          <button className={`${button({ variant: 'primary' })} mt-1 h-11`} type="submit" disabled={pending}>
            {pending && <Loader2 size={16} className="animate-spin" />}
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  )
}

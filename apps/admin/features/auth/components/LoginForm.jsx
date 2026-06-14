'use client'

import { useState } from 'react'
import { useAdminLogin } from '../hooks/useAdminLogin'

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
    <form
      onSubmit={(e) => { e.preventDefault(); submit(email, password) }}
      className="mx-auto mt-24 flex w-full max-w-sm flex-col gap-4 rounded-ec-card border bg-card p-6 shadow-ec-card"
    >
      <h1 className="text-lg font-semibold text-ec-ink">EaseCab Admin</h1>
      <input
        className="rounded-md border px-3 py-2"
        type="email"
        placeholder="Email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="rounded-md border px-3 py-2"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {errorKey && (
        <p role="alert" className="text-sm text-ec-danger">
          {MESSAGES[errorKey] ?? MESSAGES.INTERNAL_ERROR}
        </p>
      )}
      <button
        className="rounded-md bg-ec-blue px-3 py-2 font-medium text-white disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

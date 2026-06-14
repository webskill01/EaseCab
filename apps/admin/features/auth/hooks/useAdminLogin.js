'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin } from '../services/adminApi'

/**
 * Login form controller: submit → on success replace('/'); on failure expose a
 * stable errorKey ('AUTH_REQUIRED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | …) for the
 * form to map to a message.
 */
export function useAdminLogin() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  async function submit(email, password) {
    setPending(true)
    setErrorKey(null)
    try {
      await adminLogin(email, password)
      router.replace('/')
    } catch (err) {
      setErrorKey(err?.code ?? 'INTERNAL_ERROR')
    } finally {
      setPending(false)
    }
  }

  return { submit, pending, errorKey }
}

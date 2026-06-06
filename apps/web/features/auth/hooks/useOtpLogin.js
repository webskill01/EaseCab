'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { requestOtp, verifyOtp } from '../services/authApi'
import { sendOtp, confirm } from '../services/otpClient'
import { errorKey } from '../lib/errorKey'

/**
 * Login state machine: 'phone' → 'otp' → ('perms' → 'done' for new users | redirect
 * to /feed for returning users). Holds the phone (E.164), an i18n error sub-key, a
 * loading flag, and the Firebase confirmationResult (ref — survives renders).
 * Never logs phone or token (§10).
 */
export function useOtpLogin() {
  const router = useRouter()
  const [phase, setPhase] = useState('phone')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef(null)

  const submitPhone = useCallback(async (digits) => {
    const e164 = `+91${digits}`
    setLoading(true)
    setError(null)
    try {
      await requestOtp(e164)
      confirmationRef.current = await sendOtp(e164)
      setPhone(e164)
      setPhase('otp')
    } catch (err) {
      setError(errorKey(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const submitOtp = useCallback(async (code) => {
    setLoading(true)
    setError(null)
    try {
      const idToken = await confirm(confirmationRef.current, code)
      const { isNewUser } = await verifyOtp(idToken)
      if (isNewUser) setPhase('perms')
      else router.replace('/feed')
    } catch (err) {
      setError(errorKey(err))
    } finally {
      setLoading(false)
    }
  }, [router])

  const changeNumber = useCallback(() => {
    confirmationRef.current = null
    setError(null)
    setPhase('phone')
  }, [])

  const finishPermissions = useCallback(() => setPhase('done'), [])

  const goToFeed = useCallback(() => router.replace('/feed'), [router])

  return { phase, phone, error, loading, submitPhone, submitOtp, changeNumber, finishPermissions, goToFeed }
}

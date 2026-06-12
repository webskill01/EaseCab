import { useState, useRef, useCallback } from 'react'
import { startAadhaar, verifyAadhaar } from '../services/verificationApi'
import { stashPrefill } from '../lib/prefill'

/** ApiError code → a `verification.errors.*` sub-key (generic copy, §9). */
function mapError(code) {
  if (code === 'RATE_LIMITED') return 'errors.rateLimited'
  if (code === 'VALIDATION_ERROR') return 'errors.invalidOtp'
  if (code === 'NETWORK_ERROR') return 'errors.network'
  return 'errors.generic'
}

/**
 * Aadhaar L1 machine: 'input' → 'otp' → 'done'. Holds the Surepass clientId (ref)
 * and the verified name for the success banner. On verify success the transient
 * demographics are stashed for profile prefill (never logged, §10).
 */
export function useAadhaarFlow() {
  const [phase, setPhase] = useState('input')
  const [errorKey, setErrorKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [verifiedName, setVerifiedName] = useState(null)
  const clientIdRef = useRef(null)

  const submitAadhaar = useCallback(async (number) => {
    setErrorKey(null)
    if (!/^\d{12}$/.test(number)) { setErrorKey('errors.invalidAadhaar'); return }
    setLoading(true)
    try {
      const { clientId } = await startAadhaar(number)
      clientIdRef.current = clientId
      setPhase('otp')
    } catch (err) { setErrorKey(mapError(err?.code)) } finally { setLoading(false) }
  }, [])

  const submitOtp = useCallback(async (otp) => {
    setErrorKey(null)
    setLoading(true)
    try {
      const r = await verifyAadhaar({ clientId: clientIdRef.current, otp })
      stashPrefill({ name: r.name, dob: r.dob, gender: r.gender, address: r.address })
      setVerifiedName(r.name)
      setPhase('done')
    } catch (err) { setErrorKey(mapError(err?.code)) } finally { setLoading(false) }
  }, [])

  const resend = useCallback(async (number) => { await submitAadhaar(number) }, [submitAadhaar])
  const back = useCallback(() => { setErrorKey(null); setPhase('input') }, [])

  return { phase, errorKey, loading, verifiedName, submitAadhaar, submitOtp, resend, back }
}

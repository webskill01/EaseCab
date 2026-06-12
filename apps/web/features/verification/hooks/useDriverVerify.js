import { useState, useCallback } from 'react'
import { verifyDl, verifyRc } from '../services/verificationApi'

function mapError(code) {
  if (code === 'RATE_LIMITED') return 'errors.rateLimited'
  if (code === 'VALIDATION_ERROR') return 'errors.verifyFailed'
  if (code === 'NETWORK_ERROR') return 'errors.network'
  return 'errors.generic'
}

/** L2 driver-credential submissions: DL + RC, each independent. */
export function useDriverVerify() {
  const [dlResult, setDlResult] = useState(null)
  const [rcResult, setRcResult] = useState(null)
  const [dlErrorKey, setDlErrorKey] = useState(null)
  const [rcErrorKey, setRcErrorKey] = useState(null)
  const [dlSubmitting, setDlSubmitting] = useState(false)
  const [rcSubmitting, setRcSubmitting] = useState(false)

  const submitDl = useCallback(async ({ dlNumber, dob }) => {
    setDlErrorKey(null); setDlSubmitting(true)
    try { setDlResult(await verifyDl({ dlNumber, dob })) }
    catch (err) { setDlErrorKey(mapError(err?.code)) } finally { setDlSubmitting(false) }
  }, [])

  const submitRc = useCallback(async (rcNumber) => {
    setRcErrorKey(null); setRcSubmitting(true)
    try { setRcResult(await verifyRc(rcNumber)) }
    catch (err) { setRcErrorKey(mapError(err?.code)) } finally { setRcSubmitting(false) }
  }, [])

  return { submitDl, submitRc, dlResult, rcResult, dlErrorKey, rcErrorKey, dlSubmitting, rcSubmitting }
}

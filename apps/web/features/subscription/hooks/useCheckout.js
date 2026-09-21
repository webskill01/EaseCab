import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createCheckout, verifyPayment } from '../services/subscriptionApi'
import { openCheckout } from '../services/cashfreeClient'

/**
 * Cashfree upgrade/renew orchestration: create order → open the modal → ask the API
 * whether it got paid → refresh membership + payments. A closed-but-unpaid modal
 * (reason `not_paid`) is NOT an error — the user just stays on the membership screen.
 */
export function useCheckout() {
  const qc = useQueryClient()
  const [checkingOut, setCheckingOut] = useState(false)
  const [errorKey, setErrorKey] = useState(null)
  const [succeeded, setSucceeded] = useState(false)
  const [pending, setPending] = useState(false)

  async function start() {
    setErrorKey(null)
    setSucceeded(false)
    setPending(false)
    setCheckingOut(true)
    try {
      const order = await createCheckout()
      // alreadyPaid = an earlier checkout was paid but never confirmed; the API just credited it.
      if (!order.alreadyPaid) {
        await openCheckout({ order })
        const res = await verifyPayment({ orderId: order.orderId })
        if (res.reason === 'not_paid') return
        // Bank hasn't confirmed yet (async UPI) — the webhook/reconcile sweep credits it later.
        if (res.reason === 'pending') return setPending(true)
        // `duplicate` = the webhook already credited this payment — still a success.
        if (!res.credited && res.reason !== 'duplicate') throw new Error('NOT_CREDITED')
      }
      await qc.invalidateQueries({ queryKey: ['membership'] })
      await qc.invalidateQueries({ queryKey: ['payments'] })
      setSucceeded(true)
    } catch {
      setErrorKey('error.checkout')
    } finally {
      setCheckingOut(false)
    }
  }

  return { start, checkingOut, errorKey, succeeded, pending }
}

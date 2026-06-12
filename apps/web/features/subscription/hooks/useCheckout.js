import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createCheckout, verifyPayment } from '../services/subscriptionApi'
import { openCheckout } from '../services/razorpayClient'

/**
 * Razorpay upgrade/renew orchestration: create order → open the popup → verify the
 * callback → refresh membership + payments. A user-dismissed popup is NOT an error
 * (the caller just stays on the membership screen).
 *
 * @param {{ name?: string, prefillContact?: string }} [opts]
 */
export function useCheckout(opts = {}) {
  const qc = useQueryClient()
  const [checkingOut, setCheckingOut] = useState(false)
  const [errorKey, setErrorKey] = useState(null)
  const [succeeded, setSucceeded] = useState(false)

  async function start() {
    setErrorKey(null)
    setSucceeded(false)
    setCheckingOut(true)
    try {
      const order = await createCheckout()
      const { paymentId, signature } = await openCheckout({ order, name: opts.name, prefillContact: opts.prefillContact })
      const res = await verifyPayment({ orderId: order.orderId, paymentId, signature })
      if (!res.credited) throw new Error('NOT_CREDITED')
      await qc.invalidateQueries({ queryKey: ['membership'] })
      await qc.invalidateQueries({ queryKey: ['payments'] })
      setSucceeded(true)
    } catch (e) {
      if (e?.message !== 'RAZORPAY_DISMISSED') setErrorKey('error.checkout')
    } finally {
      setCheckingOut(false)
    }
  }

  return { start, checkingOut, errorKey, succeeded }
}

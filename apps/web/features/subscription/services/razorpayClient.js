/**
 * Razorpay checkout boundary (the live SDK has no logic to unit-test — mirrors
 * features/auth/services/otpClient). In E2E mode (NEXT_PUBLIC_E2E=true) the SDK is
 * bypassed with a deterministic fake so the specs can drive the verify path without
 * the hosted popup; specs network-mock our own /subscriptions endpoints.
 */

const SDK_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

/** Inject the Razorpay checkout script once; resolves when window.Razorpay is ready. */
function loadSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(window.Razorpay)
    const existing = document.querySelector(`script[src="${SDK_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay))
      existing.addEventListener('error', () => reject(new Error('RAZORPAY_SDK_FAILED')))
      return
    }
    const s = document.createElement('script')
    s.src = SDK_SRC
    s.onload = () => resolve(window.Razorpay)
    s.onerror = () => reject(new Error('RAZORPAY_SDK_FAILED'))
    document.body.appendChild(s)
  })
}

/**
 * Open the Razorpay popup for an order. Resolves with `{ paymentId, signature }` on
 * success, or rejects with Error('RAZORPAY_DISMISSED') if the user closes it.
 * @param {{ order: { orderId: string, amount: number, currency: string, keyId: string }, name?: string, prefillContact?: string }} args
 * @returns {Promise<{ paymentId: string, signature: string }>}
 */
export async function openCheckout({ order, name, prefillContact }) {
  if (process.env.NEXT_PUBLIC_E2E === 'true') {
    return { paymentId: 'e2e-pay-id', signature: 'e2e-signature' }
  }
  const Razorpay = await loadSdk()
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: name || 'EaseCab',
      prefill: prefillContact ? { contact: prefillContact } : undefined,
      handler: (res) => resolve({ paymentId: res.razorpay_payment_id, signature: res.razorpay_signature }),
      modal: { ondismiss: () => reject(new Error('RAZORPAY_DISMISSED')) },
    })
    rzp.open()
  })
}

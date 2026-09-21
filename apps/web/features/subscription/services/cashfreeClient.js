/**
 * Cashfree checkout boundary (replaces razorpayClient, Phase 16.1 — the live SDK has
 * no logic to unit-test). The browser only ever holds a short-lived payment_session_id;
 * whether the payment succeeded is decided server-side by /subscriptions/verify, so
 * this resolves on ANY modal close and the caller asks the API what happened.
 * In E2E mode (NEXT_PUBLIC_E2E=true) and demo mode (NEXT_PUBLIC_CASHFREE_STUB=true)
 * the SDK is skipped; the API's stub gateway reports the order paid.
 */

const SDK_SRC = 'https://sdk.cashfree.com/js/v3/cashfree.js'

/** Inject the Cashfree v3 script once; resolves with the window.Cashfree factory. */
function loadSdk() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Cashfree) return resolve(window.Cashfree)
    const existing = document.querySelector(`script[src="${SDK_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Cashfree))
      existing.addEventListener('error', () => reject(new Error('CASHFREE_SDK_FAILED')))
      return
    }
    const s = document.createElement('script')
    s.src = SDK_SRC
    s.onload = () => resolve(window.Cashfree)
    s.onerror = () => reject(new Error('CASHFREE_SDK_FAILED'))
    document.body.appendChild(s)
  })
}

// One SDK instance per mode (Cashfree: initialise once, reuse across checkouts).
const instances = {}

/**
 * Open the Cashfree payment modal. Resolves when the modal closes (paid, failed or
 * dismissed). Redirect-style methods navigate to the API's return_url (/membership)
 * instead, where the webhook-credited status is already visible. The mode comes from
 * the API with each order, so it can never disagree with the server's keys.
 * @param {{ order: { paymentSessionId: string, mode: 'sandbox'|'production' } }} args
 * @returns {Promise<void>}
 */
export async function openCheckout({ order }) {
  if (process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NEXT_PUBLIC_CASHFREE_STUB === 'true') return
  const Cashfree = await loadSdk()
  const mode = order.mode === 'production' ? 'production' : 'sandbox'
  instances[mode] ??= Cashfree({ mode })
  await instances[mode].checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: '_modal' })
}

import { apiFetch } from '@/lib/api/client'

/**
 * Subscription/membership API (mounted at /api/v1/subscriptions — note the plural;
 * fixed in Step 21d, the feed banner previously called the singular path and 404'd
 * against the real API).
 */

/**
 * Membership status for the feed banner + Membership screen.
 * @returns {Promise<{ status: ?string, trialExpiresAt: ?string, expiresAt: ?string, isActive: boolean }>}
 */
export async function getMembership() {
  const { data } = await apiFetch('/subscriptions/me')
  return data
}

/**
 * Create (or reuse) the ₹149 Cashfree order for the checkout modal.
 * @returns {Promise<{ orderId: string, paymentSessionId: string, amount: number, mode: string } | { alreadyPaid: true }>}
 */
export async function createCheckout() {
  const { data } = await apiFetch('/subscriptions/checkout', { method: 'POST' })
  return data
}

/**
 * After the modal closes — the API re-fetches the order from Cashfree and credits if paid.
 * @param {{ orderId: string }} body
 * @returns {Promise<{ credited: boolean, reason?: string }>}
 */
export async function verifyPayment(body) {
  const { data } = await apiFetch('/subscriptions/verify', { method: 'POST', body: JSON.stringify(body) })
  return data
}

/**
 * One page of captured-payment history (cursor-paginated).
 * @param {?string} [cursor]
 * @returns {Promise<{ payments: Array<object>, nextCursor: ?string }>}
 */
export async function listPayments(cursor) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const { data, meta } = await apiFetch(`/subscriptions/payments${qs}`)
  return { payments: data.payments, nextCursor: meta?.nextCursor ?? null }
}

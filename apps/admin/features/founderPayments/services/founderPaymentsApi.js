import { apiFetch } from '@/lib/api/client'

/** GET /admin/founder-payments?page=&status=&sort=&q= → { payments, unlinked, meta }. */
export async function fetchFounderPayments({ page = 1, status = 'all', sort = 'newest', q = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), status, sort })
  if (q) params.set('q', q)
  const { data, meta } = await apiFetch(`/admin/founder-payments?${params.toString()}`)
  return { ...data, meta }
}

/** POST /admin/founder-payments/:id/link → { member, validUntil }. */
export async function linkFounderPayment({ id, phone, grantMembership }) {
  const { data } = await apiFetch(`/admin/founder-payments/${id}/link`, {
    method: 'POST',
    body: JSON.stringify({ phone, grantMembership }),
  })
  return data
}

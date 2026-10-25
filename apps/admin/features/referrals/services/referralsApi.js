import { apiFetch } from '@/lib/api/client'

/** GET /admin/referrals?page=&status=&sort=&q= → { referrals, summary, rollout, meta }. */
export async function fetchReferrals({ page = 1, status = 'all', sort = 'newest', q = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), status, sort })
  if (q) params.set('q', q)
  const { data, meta } = await apiFetch(`/admin/referrals?${params.toString()}`)
  return { ...data, meta }
}

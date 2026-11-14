import { apiFetch } from '@/lib/api/client'

/** GET /admin/stats/renewals → { renewals[], meta } — payments after a member's first, newest first. */
export async function fetchRenewals({ page }) {
  const { data, meta } = await apiFetch(`/admin/stats/renewals?page=${page}`)
  return { renewals: data.renewals, meta }
}

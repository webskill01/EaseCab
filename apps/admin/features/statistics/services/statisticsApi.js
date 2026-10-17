import { apiFetch } from '@/lib/api/client'

/** GET /admin/stats/growth → { since, totals, days[] } (days newest first, IST). */
export async function fetchGrowth() {
  const { data } = await apiFetch('/admin/stats/growth')
  return data.growth
}

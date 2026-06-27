import { apiFetch } from '@/lib/api/client'

/** GET /admin/stats → { pendingVerifications, openReports, unresolvedCities, ridesToday }. */
export async function fetchStats() {
  const { data } = await apiFetch('/admin/stats')
  return data.stats
}

import { apiFetch } from '@/lib/api/client'

/** GET /admin/wa-groups?page=&status=&q= → { groups, counts, meta }. */
export async function fetchWaGroups({ page = 1, status = 'all', q = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), status })
  if (q) params.set('q', q)
  const { data, meta } = await apiFetch(`/admin/wa-groups?${params.toString()}`)
  return { groups: data.groups, counts: data.counts, meta }
}

/** PATCH /admin/wa-groups/:id — switch one group's ingest. */
export async function setWaGroupEnabled(id, enabled) {
  const { data } = await apiFetch(`/admin/wa-groups/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) })
  return data.group
}

/** POST /admin/wa-groups/bulk — switch every group, or those matching q. */
export async function setAllWaGroupsEnabled(enabled, q = '') {
  const body = q ? { enabled, q } : { enabled }
  const { data } = await apiFetch('/admin/wa-groups/bulk', { method: 'POST', body: JSON.stringify(body) })
  return data
}

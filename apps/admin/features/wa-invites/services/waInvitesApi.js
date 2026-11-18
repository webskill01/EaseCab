import { apiFetch } from '@/lib/api/client'

/** GET /admin/wa-invites?page=&status=&q= → { links, counts, meta }. */
export async function fetchWaInvites({ page = 1, status = 'new', q = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), status })
  if (q) params.set('q', q)
  const { data, meta } = await apiFetch(`/admin/wa-invites?${params.toString()}`)
  return { links: data.links, counts: data.counts, meta }
}

/** PATCH /admin/wa-invites/:id — 'avoided' hides a link for good, 'new' restores it. */
export async function setWaInviteStatus(id, status) {
  const { data } = await apiFetch(`/admin/wa-invites/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
  return data.link
}

import { apiFetch } from '@/lib/api/client'

/** GET /admin/bot-filters?list=&page=&q= → { entries, meta }. */
export async function fetchBotFilters(list, page = 1, q = '') {
  const params = new URLSearchParams({ list, page: String(page) })
  if (q) params.set('q', q)
  const { data, meta } = await apiFetch(`/admin/bot-filters?${params.toString()}`)
  return { entries: data.entries, meta }
}

/** POST /admin/bot-filters → { added, duplicates, invalid }. */
export async function addBotFilter(list, value) {
  const { data } = await apiFetch('/admin/bot-filters', { method: 'POST', body: JSON.stringify({ list, value }) })
  return data
}

/** DELETE /admin/bot-filters/:id. */
export async function removeBotFilter(id) {
  const { data } = await apiFetch(`/admin/bot-filters/${id}`, { method: 'DELETE' })
  return data
}

import { apiFetch } from '@/lib/api/client'

/** GET /admin/border-tax?page=&state=&status=&from=&to=&who=&q= → { filings, byStatus, meta }. Empty filters are left out. */
export async function fetchFilings({ page = 1, ...filters } = {}) {
  const params = new URLSearchParams({ page: String(page) })
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
  const { data, meta } = await apiFetch(`/admin/border-tax?${params.toString()}`)
  return { ...data, meta }
}

/** GET /admin/border-tax/states → [{ stateCd, name, paused }]. */
export async function fetchStates() {
  const { data } = await apiFetch('/admin/border-tax/states')
  return data.states
}

/** PATCH /admin/border-tax/states/:stateCd { paused }. */
export async function setStatePaused({ stateCd, paused }) {
  const { data } = await apiFetch(`/admin/border-tax/states/${stateCd}`, { method: 'PATCH', body: JSON.stringify({ paused }) })
  return data
}

/** GET /admin/border-tax/:id/receipt → short-lived PDF link. */
export async function fetchReceiptUrl(id) {
  const { data } = await apiFetch(`/admin/border-tax/${id}/receipt`)
  return data.url
}

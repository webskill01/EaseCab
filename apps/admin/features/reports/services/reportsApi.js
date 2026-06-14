import { apiFetch } from '@/lib/api/client'

/** GET /admin/reports?page=&status= → { reports, meta }. */
export async function fetchReports(page = 1, status = 'open') {
  const { data, meta } = await apiFetch(`/admin/reports?page=${page}&status=${status}`)
  return { reports: data.reports, meta }
}

/** PATCH /admin/reports/:id — dismiss or remove the reported ride. */
export async function reviewReport(id, action) {
  const { data } = await apiFetch(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
  return data.report
}

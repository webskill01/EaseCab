import { apiFetch } from '@/lib/api/client'

/** GET /admin/user-reports?page= → { users, meta }. */
export async function fetchUserReports(page = 1) {
  const { data, meta } = await apiFetch(`/admin/user-reports?page=${page}`)
  return { users: data.users, meta }
}

/** PATCH /admin/user-reports/:userId — reinstate (un-hide) or uphold (keep hidden). */
export async function reviewUserReport(userId, action) {
  const { data } = await apiFetch(`/admin/user-reports/${userId}`, { method: 'PATCH', body: JSON.stringify({ action }) })
  return data.review
}

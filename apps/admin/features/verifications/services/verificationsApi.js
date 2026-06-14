import { apiFetch } from '@/lib/api/client'

/** GET /admin/verifications?page= → { verifications, meta }. */
export async function fetchVerifications(page = 1) {
  const { data, meta } = await apiFetch(`/admin/verifications?page=${page}`)
  return { verifications: data.verifications, meta }
}

/** PATCH /admin/verifications/:id — approve, or reject with a required reason. */
export async function reviewSubmission(id, action, rejectionReason) {
  const body = action === 'reject' ? { action, rejectionReason } : { action }
  const { data } = await apiFetch(`/admin/verifications/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  return data.verification
}

/** PATCH /admin/verifications/badge/:userId — set the verified-driver badge. */
export async function setBadge(userId, status) {
  await apiFetch(`/admin/verifications/badge/${userId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

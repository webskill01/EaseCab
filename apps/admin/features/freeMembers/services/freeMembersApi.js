import { apiFetch } from '@/lib/api/client'

/** GET /admin/complimentary → members[]. */
export async function fetchFreeMembers() {
  const { data } = await apiFetch('/admin/complimentary')
  return data.members
}

/** POST /admin/complimentary → { userId, name, phone, validUntil }. */
export async function addFreeMember({ phone, months, label, note }) {
  const { data } = await apiFetch('/admin/complimentary', {
    method: 'POST',
    body: JSON.stringify({ phone, months, ...(label ? { label } : {}), ...(note ? { note } : {}) }),
  })
  return data
}

/** DELETE /admin/complimentary/:userId. */
export async function removeFreeMember(userId) {
  await apiFetch(`/admin/complimentary/${userId}`, { method: 'DELETE' })
}

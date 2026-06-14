import { apiFetch } from '@/lib/api/client'

/** GET /admin/users?page=&status=&q= → { users, meta }. */
export async function fetchUsers(page = 1, status = 'active', q = '') {
  const params = new URLSearchParams({ page: String(page), status })
  if (q) params.set('q', q)
  const { data, meta } = await apiFetch(`/admin/users?${params.toString()}`)
  return { users: data.users, meta }
}

/** PATCH /admin/users/:userId — soft-delete or restore. */
export async function updateUser(userId, action) {
  const { data } = await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ action }) })
  return data.user
}

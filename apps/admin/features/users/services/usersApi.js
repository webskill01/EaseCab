import { apiFetch } from '@/lib/api/client'

/** GET /admin/users?page=&status=&plan=&joined=&sort=&q= → { users, meta }. */
export async function fetchUsers({ page = 1, status = 'active', plan = 'all', joined = 'all', q = '', sort = 'newest' } = {}) {
  const params = new URLSearchParams({ page: String(page), status, plan, joined, sort })
  if (q) params.set('q', q)
  const { data, meta } = await apiFetch(`/admin/users?${params.toString()}`)
  return { users: data.users, meta }
}

/** GET /admin/users/:userId → full profile (images, payments, activity counts). */
export async function fetchUser(userId) {
  const { data } = await apiFetch(`/admin/users/${userId}`)
  return data.user
}

/** PATCH /admin/users/:userId — soft-delete or restore. */
export async function updateUser(userId, action) {
  const { data } = await apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ action }) })
  return data.user
}

import { apiFetch } from '@/lib/api/client'

/** POST /admin/auth/login → { admin }. Cookies are set by the server (httpOnly). */
export async function adminLogin(email, password) {
  const { data } = await apiFetch('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data.admin
}

/** GET /admin/auth/me → { admin } (used by AdminGuard). */
export async function adminMe() {
  const { data } = await apiFetch('/admin/auth/me')
  return data.admin
}

/** POST /admin/auth/logout — clears the admin cookies server-side. */
export async function adminLogout() {
  await apiFetch('/admin/auth/logout', { method: 'POST' })
}

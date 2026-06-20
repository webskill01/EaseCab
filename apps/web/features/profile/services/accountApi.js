import { apiFetch } from '@/lib/api/client'

/** Account-level actions (client service). */

/** Soft-delete the caller's account; the API also clears the auth cookies. */
export async function deleteAccount() {
  const { data } = await apiFetch('/me/account', { method: 'DELETE' })
  return data
}

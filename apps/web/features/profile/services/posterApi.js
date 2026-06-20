import { apiFetch } from '@/lib/api/client'

/** Public poster-profile API (T3-2). Read-only; no PII returned. */

/**
 * Another user's public profile (hero + stats + bio + verification flags).
 * @param {string} id - the user's UUID
 * @returns {Promise<object>} toPublicPoster shape
 */
export async function fetchPosterProfile(id) {
  const { data } = await apiFetch(`/users/${id}/profile`)
  return data
}

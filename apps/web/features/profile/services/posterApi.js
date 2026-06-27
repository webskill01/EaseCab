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

/**
 * Report a user (P13-12 #5). Body = { reason, remarks?, screenshotKey? } (userReportCreateSchema).
 * @param {string} id - reported user's UUID
 * @param {{ reason: string, remarks?: string, screenshotKey?: string }} body
 * @returns {Promise<{ reported: true, alreadyReported: boolean }>}
 */
export async function reportPoster(id, body) {
  const { data } = await apiFetch(`/users/${id}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

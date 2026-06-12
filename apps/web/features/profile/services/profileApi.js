import { apiFetch } from '@/lib/api/client'

/** Profile API (client service, Step 21c). Read/update profile + attach a verified image. */

/** @returns {Promise<object>} full profile + verification snapshot */
export async function getProfile() {
  const { data } = await apiFetch('/me/profile')
  return data
}

/**
 * Patch editable fields (+ optional dpKey).
 * @param {object} body - profileUpdateSchema shape
 * @returns {Promise<object>} updated profile
 */
export async function updateProfile(body) {
  const { data } = await apiFetch('/me/profile', { method: 'PATCH', body: JSON.stringify(body) })
  return data
}

/**
 * Attach a verified upload key to its purpose's field (used for non-DP later).
 * @param {{purpose: string, key: string}} input
 */
export async function attachImage({ purpose, key }) {
  const { data } = await apiFetch('/me/uploads', { method: 'POST', body: JSON.stringify({ purpose, key }) })
  return data
}

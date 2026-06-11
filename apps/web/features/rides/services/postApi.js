import { apiFetch } from '@/lib/api/client'

/** Post-a-Ride API (client service, Step 20). Create + free-text parse-preview. */

/**
 * Create a 24h post.
 * @param {object} body - postedRideCreateSchema shape (cityId|cityRaw per dir, phone, ...)
 * @returns {Promise<object>} the created (masked) post
 */
export async function createPost(body) {
  const { data } = await apiFetch('/posted-rides', { method: 'POST', body: JSON.stringify(body) })
  return data
}

/**
 * Parse a pasted WhatsApp message into a draft preview (read-only).
 * @param {string} text
 * @returns {Promise<object>} draft { fromCityId, fromCityName, fromCityRaw, ..., vehicleType, phone }
 */
export async function parsePost(text) {
  const { data } = await apiFetch('/posted-rides/parse', { method: 'POST', body: JSON.stringify({ text }) })
  return data
}

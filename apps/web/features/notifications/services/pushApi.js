import { apiFetch } from '@/lib/api/client'

/**
 * Push API (mounted at /api/v1/push): notification preferences (settings surface)
 * + FCM device-token register/unregister (Step 23 permission flow + logout).
 */

/**
 * Read the caller's notification preferences.
 * @returns {Promise<{ notificationCities: string[], cities: Array<{id:string,name:string}>, notifyBotRides: boolean, notifyPostedRides: boolean }>}
 */
export async function getPreferences() {
  const { data } = await apiFetch('/push/preferences')
  return data
}

/**
 * Patch preferences (any subset of toggles / city list).
 * @param {{ notificationCities?: string[], notifyBotRides?: boolean, notifyPostedRides?: boolean }} body
 */
export async function updatePreferences(body) {
  const { data } = await apiFetch('/push/preferences', { method: 'PATCH', body: JSON.stringify(body) })
  return data
}

/**
 * Register (upsert) this device's FCM token (Step 23).
 * @param {{ deviceToken: string, platform: string }} body
 */
export async function registerToken({ deviceToken, platform }) {
  const { data } = await apiFetch('/push/subscriptions', {
    method: 'POST', body: JSON.stringify({ deviceToken, platform }),
  })
  return data
}

/**
 * Unregister a device token (logout / rotation).
 * @param {{ deviceToken: string }} body
 */
export async function unregisterToken({ deviceToken }) {
  const { data } = await apiFetch('/push/subscriptions', {
    method: 'DELETE', body: JSON.stringify({ deviceToken }),
  })
  return data
}

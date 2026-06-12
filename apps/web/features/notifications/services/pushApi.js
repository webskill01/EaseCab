import { apiFetch } from '@/lib/api/client'

/**
 * Notification-preferences API (mounted at /api/v1/push). The OS-permission prompt +
 * FCM token registration land in Step 23; this is the settings surface only.
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

import { apiFetch } from '@/lib/api/client'
import { RIDE_KIND } from '../lib/rideView'

/**
 * File a report against a ride. Routes to the bot-ride or posted-ride endpoint by
 * kind. Body = { reason, remarks?, screenshotKey? } (reportCreateSchema).
 *
 * @param {{ id: string, kind: string }} ride
 * @param {{ reason: string, remarks?: string, screenshotKey?: string }} body
 * @returns {Promise<object>} the created report stub { id, createdAt }
 */
export async function reportRide(ride, body) {
  const base = ride.kind === RIDE_KIND.VERIFIED ? 'posted-rides' : 'rides'
  const { data } = await apiFetch(`/${base}/${ride.id}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data
}

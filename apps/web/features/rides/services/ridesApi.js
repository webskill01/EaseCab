import { apiFetch } from '@/lib/api/client'
import { env } from '@/config/env'

/**
 * Rides feed API (client service layer). Bot rides + app-posted (verified) rides
 * share the same list/contact shape so the feed hook can treat them uniformly.
 * Phone is never in a list payload — `contact*` is the sole reveal (after the gate).
 */

/** Build the `?limit&cursor&cityId` query string, omitting empty params. */
function feedQuery({ cursor, cityId, limit } = {}) {
  const p = new URLSearchParams()
  if (limit) p.set('limit', String(limit))
  if (cursor) p.set('cursor', cursor)
  if (cityId) p.set('cityId', cityId)
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

/** One page of the live bot feed. @returns {Promise<{rides, nextCursor}>} */
export async function listRides(params = {}) {
  const { data, meta } = await apiFetch(`/rides${feedQuery(params)}`)
  return { rides: data.rides, nextCursor: meta?.nextCursor ?? null }
}

/** Reveal a bot ride's phone at the action point (no history write). @returns {Promise<{phoneNumber}>} */
export async function contactRide(rideId) {
  const { data } = await apiFetch(`/rides/${rideId}/contact`, { method: 'POST' })
  return data
}

/** Record a bot-ride contact in the Contacted tab — fired on the Call/WhatsApp tap. */
export async function logContactRide(rideId) {
  const { data } = await apiFetch(`/rides/${rideId}/contact/log`, { method: 'POST' })
  return data
}

/** One page of the verified (app-posted) feed. @returns {Promise<{posts, nextCursor}>} */
export async function listVerifiedRides(params = {}) {
  const { data, meta } = await apiFetch(`/posted-rides${feedQuery(params)}`)
  return { posts: data.posts, nextCursor: meta?.nextCursor ?? null }
}

/** Reveal a verified post's phone at the action point (no history write). */
export async function contactVerifiedRide(postedRideId) {
  const { data } = await apiFetch(`/posted-rides/${postedRideId}/contact`, { method: 'POST' })
  return data
}

/** Record a verified-post contact in the Contacted tab — fired on the Call/WhatsApp tap. */
export async function logContactVerifiedRide(postedRideId) {
  const { data } = await apiFetch(`/posted-rides/${postedRideId}/contact/log`, { method: 'POST' })
  return data
}

/**
 * Absolute URL for the SSE live stream. EventSource can't go through apiFetch — it
 * needs a full URL and rides the httpOnly cookie via `withCredentials` (§12).
 */
export const RIDES_STREAM_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1/rides/stream`

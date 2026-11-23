import { apiFetch } from '@/lib/api/client'

/** Fuel station finder API (docs/API.md "Fuel"). */

const post = (body) => ({ method: 'POST', body: JSON.stringify(body) })

/** Active stations selling `fuel` within radiusKm, nearest first (each has distanceKm). */
export async function listNearby({ lat, lng, fuel }) {
  const { data } = await apiFetch(`/fuel/stations?lat=${lat}&lng=${lng}&fuel=${fuel}`)
  return data.stations
}

/** A city's pumps around its centre. @returns {Promise<{ center: { lat, lng }, stations: object[] }>} */
export async function cityStations({ cityId, fuel }) {
  const { data } = await apiFetch(`/fuel/stations?cityId=${cityId}&fuel=${fuel}`)
  return data
}

/**
 * Pumps along the road from `from` ({ cityId } or { lat, lng }) to the drop city.
 * Up to 3 road options (Google alternatives), each with its own pumps.
 * @returns {Promise<{ from, to, routes: { points: number[][], distanceKm: ?number, durationMin: ?number, label: ?string, approx: boolean, stations: object[] }[] }>}
 */
export async function routeStations({ from, toCityId, fuel }) {
  const start = from.cityId ? `fromCityId=${from.cityId}` : `fromLat=${from.lat}&fromLng=${from.lng}`
  const { data } = await apiFetch(`/fuel/route?${start}&toCityId=${toCityId}&fuel=${fuel}`)
  return data
}

/** Driver adds a missing station — goes to admin review (status pending). */
export async function addStation(body) {
  const { data } = await apiFetch('/fuel/stations', post(body))
  return data.station
}

/** kind: cng_yes | cng_no | closed. @returns {Promise<{ applied: boolean }>} */
export async function reportStation(id, kind) {
  const { data } = await apiFetch(`/fuel/stations/${id}/reports`, post({ kind }))
  return data
}

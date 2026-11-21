import { apiFetch } from '@/lib/api/client'

/** GET /admin/fuel?tab=&page= → { stations, counts, meta }. */
export async function fetchFuelQueue(tab, page = 1) {
  const { data, meta } = await apiFetch(`/admin/fuel?tab=${tab}&page=${page}`)
  return { ...data, meta }
}

/** PATCH /admin/fuel/stations/:id — status / fuel flags; {} just dismisses the open reports. */
export async function decideFuelStation(id, patch) {
  const { data } = await apiFetch(`/admin/fuel/stations/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  return data.station
}

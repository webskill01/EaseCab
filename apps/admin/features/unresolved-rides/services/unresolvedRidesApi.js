import { apiFetch } from '@/lib/api/client'

/** GET /admin/unresolved-rides?page= → { rides, meta }. */
export async function fetchUnresolvedRides(page = 1) {
  const params = new URLSearchParams({ page: String(page) })
  const { data, meta } = await apiFetch(`/admin/unresolved-rides?${params.toString()}`)
  return { rides: data.rides, meta }
}

/** PATCH /admin/unresolved-rides/:id — set_city (with side + cityId) or hide. */
export async function actOnUnresolvedRide(id, action, { side, cityId } = {}) {
  const body = action === 'set_city' ? { action, side, cityId } : { action }
  const { data } = await apiFetch(`/admin/unresolved-rides/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  return data
}

/** GET /admin/unresolved-rides/cities?q= → city options for the resolution picker. */
export async function searchAdminCities(q) {
  const { data } = await apiFetch(`/admin/unresolved-rides/cities?q=${encodeURIComponent(q)}`)
  return data.cities
}

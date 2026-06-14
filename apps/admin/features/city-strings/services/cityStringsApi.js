import { apiFetch } from '@/lib/api/client'

/** GET /admin/city-strings?page= → { cityStrings, meta }. */
export async function fetchCityStrings(page = 1) {
  const params = new URLSearchParams({ page: String(page) })
  const { data, meta } = await apiFetch(`/admin/city-strings?${params.toString()}`)
  return { cityStrings: data.cityStrings, meta }
}

/** PATCH /admin/city-strings/:id — resolve (with cityId) or dismiss. */
export async function actOnCityString(id, action, cityId) {
  const body = cityId ? { action, cityId } : { action }
  const { data } = await apiFetch(`/admin/city-strings/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  return data
}

/** GET /admin/city-strings/cities?q= → city options for the resolution picker. */
export async function searchAdminCities(q) {
  const { data } = await apiFetch(`/admin/city-strings/cities?q=${encodeURIComponent(q)}`)
  return data.cities
}

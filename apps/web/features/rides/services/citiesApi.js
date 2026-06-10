import { apiFetch } from '@/lib/api/client'

/**
 * City typeahead for the feed filter picker (and, later, the post form). Backed by
 * the `/cities` pg_trgm endpoint — returns top-N `{ id, canonicalName }`. The
 * backend already floors short/empty queries to an empty list.
 *
 * @param {string} q
 * @param {{ limit?: number, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ id: string, canonicalName: string }[]>}
 */
export async function searchCities(q, { limit, signal } = {}) {
  const p = new URLSearchParams({ q })
  if (limit) p.set('limit', String(limit))
  const { data } = await apiFetch(`/cities?${p.toString()}`, { signal })
  return data.cities
}

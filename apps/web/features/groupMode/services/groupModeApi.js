import { apiFetch } from '@/lib/api/client'

/** Group Mode (Phase 31) — paid WhatsApp-style view. Feeds carry full numbers (server-gated). */

const qs = (o) => {
  const p = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** @returns {Promise<{ enabled: boolean, groups: { cityId, name, namePa, nameHi }[] }>} */
export async function getGroupSettings() {
  const { data } = await apiFetch('/group-mode/settings')
  return data
}

/** @param {{ enabled: boolean, cityIds: string[] }} body */
export async function saveGroupSettings(body) {
  const { data } = await apiFetch('/group-mode/settings', { method: 'PUT', body: JSON.stringify(body) })
  return data
}

/** One page of bot rides with original text + phone. */
export async function listGroupRides({ cityId, cursor, limit } = {}) {
  const { data, meta } = await apiFetch(`/group-mode/rides${qs({ cityIds: cityId, cursor, limit })}`)
  return { items: data.rides, nextCursor: meta?.nextCursor ?? null }
}

/** One page of driver duties (done ones come back with phoneNumber null). */
export async function listGroupDuties({ cityId, cursor, limit } = {}) {
  const { data, meta } = await apiFetch(`/group-mode/duties${qs({ cityIds: cityId, cursor, limit })}`)
  return { items: data.posts, nextCursor: meta?.nextCursor ?? null }
}

/** @param {{ key: string, since: number }[]} groups */
export async function getGroupSummary(groups) {
  const g = groups.map((x) => `${x.key}.${x.since}`).join(',')
  const { data } = await apiFetch(`/group-mode/summary${qs({ g })}`)
  return data.groups
}

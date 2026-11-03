import { apiFetch } from '@/lib/api/client'

const BASE = '/admin/wa-sessions'
const json = (method, body) => ({ method, body: JSON.stringify(body ?? {}) })

/** GET /admin/wa-sessions → { sessions, totals }. */
export async function fetchWaSessions() {
  return (await apiFetch(BASE)).data
}

/** POST /admin/wa-sessions — add a session (then pair it). */
export async function createWaSession(name) {
  return (await apiFetch(BASE, json('POST', { name }))).data.session
}

/** PATCH /admin/wa-sessions/:id — rename and/or pause/resume. */
export async function updateWaSession(id, patch) {
  return (await apiFetch(`${BASE}/${id}`, json('PATCH', patch))).data.session
}

/** DELETE /admin/wa-sessions/:id — the bot logs the number out. */
export async function removeWaSession(id) {
  return (await apiFetch(`${BASE}/${id}`, { method: 'DELETE' })).data
}

/** POST /admin/wa-sessions/:id/pair — `phone` → pairing code instead of a QR. */
export async function startPairing(id, phone) {
  return (await apiFetch(`${BASE}/${id}/pair`, json('POST', phone ? { phone } : {}))).data
}

/** GET /admin/wa-sessions/:id/pair → { status, qrSvg?, code? }. */
export async function fetchPairState(id) {
  return (await apiFetch(`${BASE}/${id}/pair`)).data
}

/** POST /admin/wa-sessions/:id/share → { token, expiresAt }. */
export async function createShareLink(id) {
  return (await apiFetch(`${BASE}/${id}/share`, { method: 'POST' })).data
}

/** Public share page: GET /wa-pair/:token → { name, status, qrSvg?, code? }. */
export async function fetchPublicPair(token) {
  return (await apiFetch(`/wa-pair/${token}`)).data
}

/** Public share page: POST /wa-pair/:token. */
export async function startPublicPairing(token, phone) {
  return (await apiFetch(`/wa-pair/${token}`, json('POST', phone ? { phone } : {}))).data
}

/** GET /admin/wa-sessions/:id/analytics?period= → { period, total, cities: [{ city, count }], from, until }. */
export async function fetchSessionAnalytics(id, period) {
  return (await apiFetch(`${BASE}/${id}/analytics?period=${period}`)).data
}

/** POST /admin/wa-sessions/:id/analytics/reset — clear the session's ride counts. */
export async function resetSessionAnalytics(id) {
  return (await apiFetch(`${BASE}/${id}/analytics/reset`, { method: 'POST' })).data
}

/** GET /admin/wa-sessions/:id/groups → [{ jid, name, participants, enabled }]. */
export async function fetchSessionGroups(id) {
  return (await apiFetch(`${BASE}/${id}/groups`)).data.groups
}

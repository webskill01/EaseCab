import { apiFetch } from '@/lib/api/client'

/** Border Tax API (docs/API.md "Border Tax"). Members only — 403 SUBSCRIPTION_EXPIRED otherwise. */

const json = (body) => ({ method: 'POST', body: JSON.stringify(body ?? {}) })

/** Starts a filing. @returns {Promise<object>} filing (status queued) */
export async function createFiling(body) {
  const { data } = await apiFetch('/border-tax', json(body))
  return data.filing
}

/** One page of the caller's filings, newest first. @returns {Promise<{filings, nextCursor}>} */
export async function listFilings({ pageParam } = {}) {
  const cursor = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''
  const { data, meta } = await apiFetch(`/border-tax?limit=20${cursor}`)
  return { filings: data.filings, nextCursor: meta?.nextCursor ?? null }
}

/** One filing + `live` { step, captcha, deadline, handoff }. */
export async function getFiling(id) {
  const { data } = await apiFetch(`/border-tax/${id}`)
  return data.filing
}

/** States open for new filings (BT_LIVE_STATES minus any the admin paused). */
export async function listLiveStates() {
  const { data } = await apiFetch('/border-tax/states')
  return data.live
}

/** Each border's latest real fee: [{ stateCd, checkpost, seats, days, taxPaise, at }]. */
export async function listRates() {
  const { data } = await apiFetch('/border-tax/rates')
  return data.rates
}

/** Short-lived link to the receipt PDF (in-app QR filings). 404 when none was captured. */
export async function getReceiptUrl(id) {
  const { data } = await apiFetch(`/border-tax/${id}/receipt`)
  return data.url
}

export const sendCaptcha = (id, answer) => apiFetch(`/border-tax/${id}/captcha`, json({ answer }))
export const refreshCaptcha = (id) => apiFetch(`/border-tax/${id}/captcha/refresh`, json())
export const cancelFiling = (id) => apiFetch(`/border-tax/${id}/cancel`, json())
export const unlockFiling = (id) => apiFetch(`/border-tax/${id}/unlock`, json())

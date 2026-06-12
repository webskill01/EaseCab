/**
 * Aadhaar demographic prefill hand-off (Step 21c). The verify response carries
 * name/dob/gender/address for editable profile PREFILL only — the backend never
 * persists them (§10). We stash them in sessionStorage so a mid-onboarding reload
 * keeps the prefill, and clear on a successful profile save. SSR-safe.
 */
const KEY = 'ec_aadhaar_prefill'

export function stashPrefill(demographics) {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(KEY, JSON.stringify(demographics)) } catch { /* quota/availability — non-fatal */ }
}

export function readPrefill() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(sessionStorage.getItem(KEY)) || null } catch { return null }
}

export function clearPrefill() {
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(KEY) } catch { /* non-fatal */ }
}

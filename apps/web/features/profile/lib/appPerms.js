/**
 * App-permissions helpers (Profile → App permissions sheet, T2-D). Pure: no browser
 * access lives here — the hook reads `Notification.permission` / the Permissions API
 * and normalizes the raw values through `normPerm` so the sheet renders one vocabulary.
 */
export const PERM = Object.freeze({
  GRANTED: 'granted',
  DENIED: 'denied',
  PROMPT: 'prompt', // not yet decided — an "Allow" button can still prompt
  UNSUPPORTED: 'unsupported', // platform exposes no web API for this permission
})

/**
 * Map a raw Permissions API / Notification.permission value to a PERM. The two APIs
 * spell "not decided yet" differently ('prompt' vs 'default'); anything unknown is
 * treated as unsupported so the sheet shows it as read-only rather than prompting.
 * @param {string} raw
 * @returns {string} a PERM value
 */
export function normPerm(raw) {
  if (raw === PERM.GRANTED) return PERM.GRANTED
  if (raw === PERM.DENIED) return PERM.DENIED
  if (raw === PERM.PROMPT || raw === 'default') return PERM.PROMPT
  return PERM.UNSUPPORTED
}

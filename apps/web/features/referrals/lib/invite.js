/**
 * Invite links (Phase 22): easecab.com/r/<code>, code = the referrer's user id. The /r page
 * stores the code; once the friend is signed in, AutoClaimReferral links them to the referrer.
 * localStorage survives the Play Store install because the TWA shares Chrome's storage.
 */
export const INVITE_KEY = 'ec_ref'
export const INVITE_CODE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const INVITE_BASE = 'https://easecab.com/r/'

/** @param {string} code */
export function saveInvite(code) {
  if (!INVITE_CODE_RE.test(code)) return
  try { localStorage.setItem(INVITE_KEY, code) } catch { /* storage blocked — no attribution, nothing breaks */ }
}

export function readInvite() {
  try { return localStorage.getItem(INVITE_KEY) } catch { return null }
}

export function clearInvite() {
  try { localStorage.removeItem(INVITE_KEY) } catch { /* ignore */ }
}

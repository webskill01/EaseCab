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

/**
 * The Android app reads the Play Install Referrer on first open and launches the site
 * with ?ref=<code>. Call once per page load (root) — before AuthGuard's /login redirect
 * drops the query. This is the path that works when the invite was opened in a browser
 * other than Chrome (Samsung Internet etc.), whose storage the app can't see.
 */
export function captureInviteFromUrl() {
  try {
    const code = new URLSearchParams(window.location.search).get('ref')
    if (code) saveInvite(code)
  } catch { /* no URL access — nothing to capture */ }
}

export function readInvite() {
  try { return localStorage.getItem(INVITE_KEY) } catch { return null }
}

export function clearInvite() {
  try { localStorage.removeItem(INVITE_KEY) } catch { /* ignore */ }
}

// Floating button (Play app v10+, apps/twa BubbleService). The native launcher opens
// the site with ?bubble=1 on every launch; the flag is kept in localStorage so it survives
// a fresh reload of the tab (Chrome restoring/recreating it drops sessionStorage and the
// query, which hid the toggle until the app was reopened).
// ponytail: localStorage is shared with plain Chrome, so the toggle can show there too on
// a device that has the app; tapping it still opens the app's switch, so that's harmless.
const SUPPORT_KEY = 'ec_bubble'
const ON_KEY = 'ec_bubble_on' // UI hint only — the app itself holds the real state
const PACKAGE = 'com.easecab.app'

/** Call once per page load (root layout) — before any redirect drops the query. */
export function markBubbleSupport() {
  try {
    if (new URLSearchParams(window.location.search).get('bubble') === '1') localStorage.setItem(SUPPORT_KEY, '1')
  } catch { /* storage blocked — the toggle just stays hidden */ }
}

export function bubbleSupported() {
  try { return localStorage.getItem(SUPPORT_KEY) === '1' } catch { return false }
}

export function bubbleOn() {
  try { return localStorage.getItem(ON_KEY) === '1' } catch { return false }
}

/** Hands the switch to the native app (it asks for "Display over other apps" if needed). */
export function setBubble(on) {
  try { localStorage.setItem(ON_KEY, on ? '1' : '0') } catch { /* hint only */ }
  window.location.href = `intent://bubble?on=${on ? 1 : 0}#Intent;scheme=easecab;package=${PACKAGE};end`
}

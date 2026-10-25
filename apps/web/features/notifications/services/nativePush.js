// Native push (Play app v11+, apps/twa PushService). The launcher opens the site with a
// URL fragment — #nperm=1|0&nbat=1|0&ntok=<fcm token>&npc=<rideId,...> — that never
// reaches the server and survives redirects. Kept in localStorage (shared by every tab of
// the app's Chrome), NOT per tab: a tab opened without the fragment would otherwise
// register a browser token and delete the app's, flip-flopping alerts between the two.
// Older app builds and other phones never get the fragment and keep browser (web) push.
// The app runs in Chrome, which hands Notification.requestPermission() and geolocation to
// the app: the prompts are EaseCab's own Android ones and Notification.permission is the
// app's real state, so permissions need nothing native-specific here.
const KEY = 'ec_native'
const PACKAGE = 'com.easecab.app'
// ponytail: app uninstalled → this phone's Chrome falls back to web push after 30 days.
const TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Call once per page load (root layout), before anything rewrites the hash. */
export function captureNativeLaunch() {
  try {
    const p = new URLSearchParams(window.location.hash.slice(1))
    if (!p.has('nperm')) return
    const prev = state()
    localStorage.setItem(KEY, JSON.stringify({
      battery: p.get('nbat') === '1', at: Date.now(),
      token: p.get('ntok') || prev?.token || null,
      contacts: [...(prev?.contacts || []), ...(p.get('npc') || '').split(',').filter(Boolean)],
    }))
    history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch { /* storage blocked — stays on web push */ }
}

function state() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && Date.now() - s.at < TTL_MS ? s : null
  } catch { return null }
}

export function isNative() { return !!state() }
/** True when Android may kill alerts in the background (battery not "Unrestricted"). */
export function batteryRestricted() { return isNative() && !state().battery }
export function pushPlatform() { return isNative() ? 'android' : 'web' }

/** Android's notification prompt (via Chrome), then the app's FCM token. */
export async function nativePermissionAndToken() {
  const permission = await Notification.requestPermission()
  return { permission, token: permission === 'granted' ? state().token : null }
}

/** App info screen: Battery → Unrestricted, or Permissions after a hard "Don't allow". */
export function openAppSettings() { openApp('settings') }

/** Ride ids the user called/WhatsApp'd straight from a notification; read once. */
export function takePendingContacts() {
  const s = state()
  if (!s?.contacts.length) return []
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, contacts: [] })) } catch { /* read-once is best-effort */ }
  return s.contacts
}

function openApp(host) {
  window.location.href = `intent://${host}#Intent;scheme=easecab;package=${PACKAGE};end`
}

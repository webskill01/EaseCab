/** localStorage-backed push state (Step 23). SSR-safe (guards `window`). */
const VIEWED = 'ec_push_viewed_rides'
const DISMISSED = 'ec_push_preprompt_dismissed'
const TOKEN = 'ec_push_token'
const VIEW_CAP = 10

function read(key) {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}
function write(key, val) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, val)
}

/** Record a distinct ride as viewed; returns the new distinct count. */
export function markRideViewed(id) {
  const ids = new Set(JSON.parse(read(VIEWED) || '[]'))
  if (ids.size < VIEW_CAP) ids.add(id)
  write(VIEWED, JSON.stringify([...ids]))
  return ids.size
}
export function getViewedCount() {
  return new Set(JSON.parse(read(VIEWED) || '[]')).size
}
export function isPrePromptDismissed() {
  return read(DISMISSED) === '1'
}
export function dismissPrePrompt() {
  write(DISMISSED, '1')
}
export function getStoredToken() {
  return read(TOKEN)
}
export function setStoredToken(token) {
  write(TOKEN, token)
}
export function clearStoredToken() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN)
}

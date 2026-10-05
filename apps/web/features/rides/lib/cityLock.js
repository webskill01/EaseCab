/**
 * Persist the live city-filter lock across sessions in a cookie (SCREENS §2 — the
 * lock survives reloads). Stores an array of `{ id, name }` (multi-select); an empty
 * array means "All cities". Cookie (not localStorage) keeps it consistent with the
 * app's cookie-based session/locale. Back-compat: an older single-object cookie is
 * read as a one-element array.
 */

const COOKIE = 'ec_city_lock'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/** @returns {{id: string, name: string}[]} the locked cities ([] = All) */
export function readCityLock() {
  if (typeof document === 'undefined') return []
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`))
  if (!match) return []
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1)))
    const arr = Array.isArray(parsed) ? parsed : [parsed] // legacy single-object cookie
    return arr.filter((c) => c && c.id).map((c) => ({ id: c.id, name: c.name }))
  } catch {
    return []
  }
}

/** Persist (or clear, when empty) the lock. @param {{id,name}[]} cities */
export function writeCityLock(cities) {
  if (typeof document === 'undefined') return
  if (!cities || cities.length === 0) {
    document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`
    return
  }
  const value = encodeURIComponent(JSON.stringify(cities.map((c) => ({ id: c.id, name: c.name }))))
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

const RECENT_KEY = 'ec_recent_cities'
export const RECENT_MAX = 5

/** City ids the user picked in the filter, most recent first (device-local convenience). @returns {string[]} */
export function readRecentCities() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(arr) ? arr.filter((id) => typeof id === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return [] // private mode / blocked storage — quick picks fall back to the hubs
  }
}

/** Move `id` to the front of the recent list. @param {string} id */
export function pushRecentCity(id) {
  try {
    const next = [id, ...readRecentCities().filter((x) => x !== id)].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — recents are a nicety, never block the filter
  }
}

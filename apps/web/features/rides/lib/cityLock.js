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

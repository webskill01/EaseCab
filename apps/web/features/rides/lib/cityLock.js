/**
 * Persist the live city-filter lock across sessions in a cookie (SCREENS §2 — the
 * lock survives reloads). Stores `{ id, name }` or null for "All cities". Cookie
 * (not localStorage) keeps it consistent with the app's cookie-based session/locale.
 */

const COOKIE = 'ec_city_lock'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/** @returns {?{id: string, name: string}} the locked city, or null for All */
export function readCityLock() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`))
  if (!match) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1)))
    return parsed && parsed.id ? { id: parsed.id, name: parsed.name } : null
  } catch {
    return null
  }
}

/** Persist (or clear, when `city` is null) the lock. @param {?{id,name}} city */
export function writeCityLock(city) {
  if (typeof document === 'undefined') return
  if (!city) {
    document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`
    return
  }
  const value = encodeURIComponent(JSON.stringify({ id: city.id, name: city.name }))
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

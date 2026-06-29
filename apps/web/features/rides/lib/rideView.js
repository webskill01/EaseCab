/**
 * Pure view-model helpers for the rides feed (no React, no I/O). The card and
 * its tests consume these so display logic is unit-tested in isolation.
 * Distilled from the prototype `design_handoff_easecab/app/shared.jsx`
 * (`statusOf` / `relTime` / `vehIcon`) + SCREENS.md §13 "Status logic".
 */

/**
 * Mirrors backend `RIDE_TIMING.BOOKED_AFTER_MIN` (@easecab/shared). A bot ride
 * reads as "Fresh" only within this window; after it — or once the cron flips the
 * row to `booked` — it shows "Likely booked". Kept local so the browser bundle
 * doesn't pull the Node-only shared package.
 */
export const FRESH_WINDOW_MIN = 5

/** Ride source: bot-ingested vs app-posted (verified). */
export const RIDE_KIND = Object.freeze({ BOT: 'bot', VERIFIED: 'verified' })

/** The three card display statuses (drive badge + dimming). */
export const RIDE_DISPLAY_STATUS = Object.freeze({ FRESH: 'fresh', BOOKED: 'booked', VERIFIED: 'verified' })

/**
 * Whole minutes elapsed since `receivedAt`, never negative (clock skew → 0).
 * @param {Date|string|number} receivedAt
 * @param {number} [now] - epoch ms (injectable for tests / the live tick)
 * @returns {number}
 */
export function ageMinFrom(receivedAt, now = Date.now()) {
  const t = receivedAt instanceof Date ? receivedAt.getTime() : new Date(receivedAt).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((now - t) / 60000))
}

/**
 * Derive the display status. Verified posts are always "verified". A bot ride is
 * "fresh" only while the server still has it `fresh` AND it's within the window —
 * so it ages to "booked" client-side without waiting for an SSE/cron push.
 * @param {{ kind: string, status: string, ageMin: number }} ride
 * @returns {'fresh'|'booked'|'verified'}
 */
export function statusOf({ kind, status, ageMin }) {
  if (kind === RIDE_KIND.VERIFIED) return RIDE_DISPLAY_STATUS.VERIFIED
  if (status === 'fresh' && ageMin <= FRESH_WINDOW_MIN) return RIDE_DISPLAY_STATUS.FRESH
  return RIDE_DISPLAY_STATUS.BOOKED
}

/**
 * Relative-time as an i18n token + count (NOT a literal string — the component
 * localizes via `t('rides.time.<key>', { count })`, keeping JSX string-free §14).
 * @param {number} ageMin
 * @returns {{ key: 'justNow'|'minAgo'|'hourAgo', count?: number }}
 */
export function relParts(ageMin) {
  if (ageMin <= 0) return { key: 'justNow' }
  if (ageMin < 60) return { key: 'minAgo', count: ageMin }
  return { key: 'hourAgo', count: Math.floor(ageMin / 60) }
}

/**
 * History-only relative time (My Rides cards) — coarser & more human than the
 * feed's per-minute granularity. Under 24h: hours, with minutes when non-zero
 * ("3h" / "3h 20m"). 24h+: days, with hours when non-zero ("2d" / "2d 5h").
 * Same i18n-token contract as relParts; compound forms add a `sub` count.
 * @param {number} ageMin
 * @returns {{ key: string, count?: number, sub?: number }}
 */
export function relPartsLong(ageMin) {
  if (ageMin <= 0) return { key: 'justNow' }
  if (ageMin < 60) return { key: 'minAgo', count: ageMin }
  if (ageMin < 1440) {
    const h = Math.floor(ageMin / 60)
    const m = ageMin % 60
    return m === 0 ? { key: 'hoursShort', count: h } : { key: 'hoursMinShort', count: h, sub: m }
  }
  const d = Math.floor(ageMin / 1440)
  const h = Math.floor((ageMin % 1440) / 60)
  return h === 0 ? { key: 'daysShort', count: d } : { key: 'daysHrShort', count: d, sub: h }
}

// next-intl locale → Intl BCP-47 tag for date formatting (all India locales).
const DATE_LOCALE = Object.freeze({ en: 'en-IN', hinglish: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' })

function dayStart(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Format a verified ride's travel date for the card. Today/Tomorrow as i18n
 * tokens (component localizes via `t('rides.time.<key>')`); any other date as a
 * locale-aware "DD Mon" string. Pure — caller passes `useLocale()`.
 * @param {?(Date|string|number)} date - ISO datetime (UTC midnight from the API)
 * @param {string} [locale]
 * @param {number} [now] - epoch ms (injectable for tests)
 * @returns {{key: 'today'|'tomorrow'}|{text: string}|null}
 */
export function rideDateParts(date, locale = 'en', now = Date.now()) {
  if (!date) return null
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime()
  if (Number.isNaN(t)) return null
  const days = Math.round((dayStart(t) - dayStart(now)) / 86400000)
  if (days === 0) return { key: 'today' }
  if (days === 1) return { key: 'tomorrow' }
  return { text: new Intl.DateTimeFormat(DATE_LOCALE[locale] || 'en-IN', { day: '2-digit', month: 'short' }).format(t) }
}

/**
 * Exact contact timestamp for the Contacted tab — "DD Mon, h:mm am/pm", locale-aware
 * (hour12 across all India locales). An absolute stamp, NOT "2 days ago": a user who
 * contacted 10+ rides in one day needs to pinpoint which ride a number belongs to,
 * and relative time can't disambiguate that. Pure — caller passes useLocale().
 * @param {?(Date|string|number)} date
 * @param {string} [locale]
 * @returns {?string}
 */
export function contactedStamp(date, locale = 'en') {
  if (!date) return null
  const t = date instanceof Date ? date.getTime() : new Date(date).getTime()
  if (Number.isNaN(t)) return null
  return new Intl.DateTimeFormat(DATE_LOCALE[locale] || 'en-IN', {
    timeZone: 'Asia/Kolkata', // India-only app — pin to IST so the stamp matches the rest of the UI (i18n config)
    day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(t)
}

// Vehicle-type enum label (@easecab/shared VEHICLE_TYPES) → glyph key for VehicleIcon.
const VEH_ICON_KEY = Object.freeze({
  Sedan: 'sedan',
  Auto: 'sedan',
  Innova: 'suv',
  SUV: 'suv',
  Bolero: 'suv',
  'Tempo Traveller': 'tt',
  Urbania: 'tt',
  Bus: 'bus',
})

/**
 * Map a stored `vehicleType` to a VehicleIcon glyph key; unknown/null → 'car'.
 * @param {?string} vehicleType
 * @returns {'sedan'|'suv'|'tt'|'bus'|'car'}
 */
export function vehIconKey(vehicleType) {
  return VEH_ICON_KEY[vehicleType] || 'car'
}

function titleCase(s) {
  return s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

// Matches an http/https URL up to the next whitespace (drivers paste Insta / app
// / referral links into ride notes — strip them out of the displayed message).
const URL_RE = /\bhttps?:\/\/\S+/gi

/**
 * Remove embedded links from a ride message for display. Uses http/https as the
 * identifier per the locked decision; collapses the whitespace the removed link
 * leaves behind and trims. Returns null when nothing usable remains.
 * @param {?string} msg
 * @returns {?string}
 */
export function stripUrls(msg) {
  if (!msg) return null
  const cleaned = msg.replace(URL_RE, '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim()
  return cleaned === '' ? null : cleaned
}

/**
 * The label to render for a route endpoint: the resolved canonical name when
 * present, else the title-cased raw fragment, else null (caller shows "—").
 * @param {?string} name - joined canonicalName from the API
 * @param {?string} raw - the original extracted fragment
 * @returns {?string}
 */
export function cityLabel(name, raw) {
  if (name) return name
  if (raw && raw.trim()) return titleCase(raw.trim())
  return null
}

/**
 * Pick the city name for the active locale (#10). pa/hi use the localized name
 * when present; en, hinglish, or a missing localization fall back to the base
 * (canonical/raw) label. Pure — the card passes `useLocale()` in.
 * @param {?string} base - cityLabel() result (canonical or title-cased raw)
 * @param {?{pa?: ?string, hi?: ?string}} localized
 * @param {string} locale
 * @returns {?string}
 */
export function pickCityName(base, localized, locale) {
  if (locale === 'pa' && localized?.pa) return localized.pa
  if (locale === 'hi' && localized?.hi) return localized.hi
  return base
}

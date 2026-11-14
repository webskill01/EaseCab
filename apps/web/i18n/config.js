/**
 * Client-safe locale constants (NO next/headers import) so client components
 * (e.g. the language switcher) can use them. locale.js re-exports these for the
 * server. Punjabi = Gurmukhi script only (CLAUDE.md §14).
 */
export const LOCALES = ['en', 'pa', 'hi', 'hinglish']
export const DEFAULT_LOCALE = 'hinglish' // English phones open in Hinglish; hi/pa phones get their own script (locale.js)
export const LOCALE_COOKIE = 'locale'
/** Set on every pick from 2026-11-15. An 'en' cookie without it predates Hinglish-by-default → read as Hinglish. */
export const LOCALE_PICKED_COOKIE = 'locale_v2'

/** Short labels — shown in the active pill + as the dropdown code badge. */
export const LOCALE_LABELS = Object.freeze({
  en: 'EN',
  pa: 'ਪੰ',
  hi: 'हि',
  hinglish: 'Hin',
})

/** Full names — shown in the dropdown rows (each in its own script). */
export const LOCALE_NAMES = Object.freeze({
  en: 'English',
  pa: 'ਪੰਜਾਬੀ',
  hi: 'हिन्दी',
  hinglish: 'Hinglish',
})

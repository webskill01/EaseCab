/**
 * Client-safe locale constants (NO next/headers import) so client components
 * (e.g. the language switcher) can use them. locale.js re-exports these for the
 * server. Punjabi = Gurmukhi script only (CLAUDE.md §14).
 */
export const LOCALES = ['en', 'pa', 'hi', 'hinglish']
export const DEFAULT_LOCALE = 'en'
export const LOCALE_COOKIE = 'locale'

/** Short labels for the language switcher (Gurmukhi/Devanagari in-script). */
export const LOCALE_LABELS = Object.freeze({
  en: 'EN',
  pa: 'ਪੰ',
  hi: 'हि',
  hinglish: 'Hin',
})

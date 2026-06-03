import { cookies } from 'next/headers'

/** Supported locales. Punjabi = Gurmukhi script only (CLAUDE.md §14). */
export const LOCALES = ['en', 'pa', 'hi', 'hinglish']
export const DEFAULT_LOCALE = 'en'
export const LOCALE_COOKIE = 'locale'

/**
 * Reads the active locale from the cookie, falling back to DEFAULT_LOCALE for a
 * missing or unsupported value. Safe to call in any server (request) context.
 * @returns {string}
 */
export function getUserLocale() {
  const value = cookies().get(LOCALE_COOKIE)?.value
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE
}

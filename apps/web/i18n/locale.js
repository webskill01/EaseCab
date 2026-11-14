import { cookies, headers } from 'next/headers'
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_PICKED_COOKIE } from './config'

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE }

/**
 * No cookie yet: a Hindi or Punjabi phone gets its own script, every other phone
 * (English included) gets DEFAULT_LOCALE (Hinglish).
 * @param {string | null | undefined} acceptLanguage
 * @returns {string}
 */
export function deviceLocale(acceptLanguage) {
  const primary = (acceptLanguage || '').split(',')[0].trim().slice(0, 2).toLowerCase()
  return primary === 'hi' || primary === 'pa' ? primary : DEFAULT_LOCALE
}

/**
 * Reads the active locale from the cookie (the driver's own pick), falling back to
 * the phone's language for a missing or unsupported value. Safe to call in any
 * server (request) context. `cookies()` / `headers()` are async as of Next 15.
 * @returns {Promise<string>}
 */
export async function getUserLocale() {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  // English picked before Hinglish became the default → move to Hinglish (once: a fresh pick sets the marker)
  if (value === 'en' && !store.get(LOCALE_PICKED_COOKIE)) return DEFAULT_LOCALE
  if (LOCALES.includes(value)) return value
  return deviceLocale((await headers()).get('accept-language'))
}

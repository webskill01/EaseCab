import { cookies } from 'next/headers'
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE } from './config'

export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE }

/**
 * Reads the active locale from the cookie, falling back to DEFAULT_LOCALE for a
 * missing or unsupported value. Safe to call in any server (request) context.
 * `cookies()` is async as of Next 15.
 * @returns {Promise<string>}
 */
export async function getUserLocale() {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE
}

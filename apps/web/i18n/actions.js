'use server'

import { cookies } from 'next/headers'
import { LOCALES, LOCALE_COOKIE } from './locale'

/**
 * Persists the chosen locale in a cookie. Rejects unsupported values.
 * Called from the (future, Step 21) language switcher.
 * @param {string} locale
 */
export async function setLocale(locale) {
  if (!LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  cookies().set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}

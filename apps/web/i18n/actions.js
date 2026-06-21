'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { LOCALES, LOCALE_COOKIE } from './config'

/**
 * Persists the chosen locale in a cookie and re-renders the layout tree so the
 * switch applies LIVE. `revalidatePath('/', 'layout')` is what makes it reliable:
 * the root layout reads the locale cookie server-side, so it must be invalidated
 * here — otherwise the client `router.refresh()` races the cookie write and the
 * UI lags a switch behind (or only updates on a full navigation). §14.
 * @param {string} locale
 */
export async function setLocale(locale) {
  if (!LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  revalidatePath('/', 'layout')
}

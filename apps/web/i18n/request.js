import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from './locale'

/**
 * Supplies the active locale + messages for every request. Loads the i18next-
 * style per-namespace files (CLAUDE.md §14 path public/locales/<locale>/) and
 * exposes them under next-intl namespaces — useTranslations('common'). Add more
 * namespaces here as feature steps introduce them (auth, rides, ...).
 */
export default getRequestConfig(async () => {
  const locale = getUserLocale()
  const common = (await import(`../public/locales/${locale}/common.json`)).default
  const auth = (await import(`../public/locales/${locale}/auth.json`)).default
  const rides = (await import(`../public/locales/${locale}/rides.json`)).default
  const mine = (await import(`../public/locales/${locale}/mine.json`)).default
  return {
    locale,
    messages: { common, auth, rides, mine },
  }
})

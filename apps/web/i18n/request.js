import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from './locale'

/**
 * Supplies the active locale + messages for every request. Loads the i18next-
 * style per-namespace files (CLAUDE.md §14 path public/locales/<locale>/) and
 * exposes them under next-intl namespaces — useTranslations('common'). Add more
 * namespaces here as feature steps introduce them (auth, rides, ...).
 */
export default getRequestConfig(async () => {
  const locale = await getUserLocale()
  const common = (await import(`../public/locales/${locale}/common.json`)).default
  const auth = (await import(`../public/locales/${locale}/auth.json`)).default
  const rides = (await import(`../public/locales/${locale}/rides.json`)).default
  const mine = (await import(`../public/locales/${locale}/mine.json`)).default
  const post = (await import(`../public/locales/${locale}/post.json`)).default
  const profile = (await import(`../public/locales/${locale}/profile.json`)).default
  const verification = (await import(`../public/locales/${locale}/verification.json`)).default
  const membership = (await import(`../public/locales/${locale}/membership.json`)).default
  const settings = (await import(`../public/locales/${locale}/settings.json`)).default
  const chat = (await import(`../public/locales/${locale}/chat.json`)).default
  const notifications = (await import(`../public/locales/${locale}/notifications.json`)).default
  return {
    // next-intl v4 requires an explicit timeZone, else it logs ENVIRONMENT_FALLBACK
    // and risks server/client markup mismatches. EaseCab is India-only (§1).
    timeZone: 'Asia/Kolkata',
    locale,
    messages: { common, auth, rides, mine, post, profile, verification, membership, settings, chat, notifications },
  }
})

'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { ChevL, Check } from '@/components/ui/icons'
import { LOCALES, LOCALE_LABELS, LOCALE_NAMES } from '@/i18n/config'
import { setLocale } from '@/i18n/actions'

/**
 * Full-screen language picker (profile.jsx LanguageScreen, §4.B) — its own route off the
 * profile hub. Writes the locale cookie via the setLocale server action, then refreshes
 * so the server layout re-reads it (messages + script font), and returns to /profile.
 */
export function LanguageScreen() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const router = useRouter()
  const current = useLocale()

  async function choose(locale) {
    await setLocale(locale)
    router.push('/profile')
    router.refresh()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <div className="flex shrink-0 items-center gap-2 border-b border-ec-line bg-white px-3.5 py-3">
        <button type="button" onClick={() => router.push('/profile')} aria-label={tc('actions.back')} className="flex h-9 w-9 items-center justify-center rounded-lg text-ec-ink">
          <ChevL size={24} />
        </button>
        <div className="flex-1 text-[18px] font-extrabold tracking-tight text-ec-ink">{t('nav.language')}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
          {LOCALES.map((l, i) => {
            const active = l === current
            return (
              <button key={l} type="button" onClick={() => choose(l)} aria-label={LOCALE_NAMES[l]}
                className={`flex w-full items-center gap-3 px-4 py-[15px] text-left ${i < LOCALES.length - 1 ? 'border-b border-ec-line' : ''} ${active ? 'bg-ec-sky' : ''}`}>
                <span className={`inline-flex w-[30px] shrink-0 text-[13px] font-extrabold ${active ? 'text-ec-blue' : 'text-ec-ink60'}`}>{LOCALE_LABELS[l]}</span>
                <span className={`flex-1 text-[15px] ${active ? 'font-extrabold text-ec-blue' : 'font-semibold text-ec-ink'}`}>{LOCALE_NAMES[l]}</span>
                {active && <Check size={18} className="shrink-0 text-ec-blue" />}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

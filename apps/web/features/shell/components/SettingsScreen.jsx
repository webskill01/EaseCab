'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Globe } from '@/components/ui/icons'
import { LanguageMenu } from './LanguageMenu'
import { LogoutButton } from './LogoutButton'
import { SupportButton } from './SupportButton'
import { NotificationSettings } from '@/features/notifications/components/NotificationSettings'

/** Settings hub (SCREENS §6) — notification prefs + language + support + logout. */
export function SettingsScreen() {
  const t = useTranslations('settings')
  const locale = useLocale()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-ec-bg p-4">
      <h1 className="text-[20px] font-extrabold text-ec-ink">{t('title')}</h1>
      <NotificationSettings />

      <section className="flex items-center justify-between rounded-2xl border border-ec-line bg-white p-4">
        <span className="flex items-center gap-2 text-[14px] font-bold text-ec-ink"><Globe size={16} /> {t('language.title')}</span>
        <LanguageMenu current={locale} />
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-ec-line bg-white p-4">
        <span className="text-[14px] font-bold text-ec-ink">{t('support.title')}</span>
        <SupportButton />
      </section>

      <div className="pt-2"><LogoutButton /></div>
    </div>
  )
}

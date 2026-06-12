'use client'

import { useTranslations } from 'next-intl'
import { Info } from '@/components/ui/icons'

/** Shown on the hub when profileComplete is false (SCREENS §6). */
export function CompletenessBanner({ onAction }) {
  const t = useTranslations('profile')
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-ec-warnBg p-3.5">
      <span className="mt-0.5 inline-flex text-ec-warning"><Info size={18} /></span>
      <div className="flex-1">
        <p className="text-[14px] font-extrabold text-ec-ink">{t('completeness.title')}</p>
        <p className="mt-0.5 text-[12.5px] font-medium text-ec-ink60">{t('completeness.body')}</p>
        <button type="button" onClick={onAction} className="mt-2 text-[13px] font-extrabold text-ec-blue">{t('completeness.cta')}</button>
      </div>
    </div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { Info } from '@/components/ui/icons'

/** No-Aadhaar fallback — informational only in 21c (admin path is Step 24). */
export function ManualFallbackNote() {
  const t = useTranslations('verification')
  return (
    <div className="mt-auto flex items-start gap-2.5 rounded-xl bg-ec-bg p-3">
      <span className="mt-0.5 inline-flex text-ec-ink40"><Info size={16} /></span>
      <div>
        <p className="text-[12.5px] font-extrabold text-ec-ink">{t('fallback.title')}</p>
        <p className="text-[12px] font-medium text-ec-ink60">{t('fallback.body')}</p>
      </div>
    </div>
  )
}

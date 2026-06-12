'use client'

import { useTranslations } from 'next-intl'
import { Check } from '@/components/ui/icons'

/** Aadhaar-verified success header shown above the completion form. */
export function L1SuccessBanner({ name }) {
  const t = useTranslations('verification')
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-ec-successBg p-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ec-success text-white"><Check size={26} /></span>
      <p className="text-[16px] font-extrabold text-ec-successTx">{t('l1.successTitle')}</p>
      {name && <p className="text-[13px] font-semibold text-ec-ink60">{t('l1.verifiedAs', { name })}</p>}
      <p className="text-[12.5px] font-medium text-ec-ink60">{t('l1.successBody')}</p>
    </div>
  )
}

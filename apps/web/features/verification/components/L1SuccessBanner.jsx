'use client'

import { useTranslations } from 'next-intl'
import { SuccessBadge } from '@/components/ui/SuccessBadge'

/** Aadhaar-verified success header shown above the completion form. */
export function L1SuccessBanner({ name }) {
  const t = useTranslations('verification')
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-ec-successBg p-4 text-center">
      <SuccessBadge circleClass="bg-ec-success text-white" ringClass="border-ec-success/50" size={48} tick={26} />
      <p className="text-[16px] font-extrabold text-ec-successTx">{t('l1.successTitle')}</p>
      {name && <p className="text-[13px] font-semibold text-ec-ink60">{t('l1.verifiedAs', { name })}</p>}
      <p className="text-[12.5px] font-medium text-ec-ink60">{t('l1.successBody')}</p>
    </div>
  )
}

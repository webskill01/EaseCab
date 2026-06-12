'use client'

import { useTranslations } from 'next-intl'

/** Small per-document status chip (profile.status.*). */
export function DocStatusBadge({ stateKey }) {
  const t = useTranslations('profile')
  const tone = stateKey === 'verified' ? 'bg-ec-successBg text-ec-successTx'
    : stateKey === 'submitted' ? 'bg-ec-bookedBg text-ec-bookedTx' : 'bg-ec-bg text-ec-ink60'
  return <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${tone}`}>{t(`status.${stateKey}`)}</span>
}

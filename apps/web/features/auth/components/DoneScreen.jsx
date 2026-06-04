'use client'

import { useTranslations } from 'next-intl'

/**
 * New-user success screen (DESIGN.md §7.1 step 4). No backend call — the trial
 * was created server-side at verify-otp. "Enter EaseCab" routes to the feed.
 * @param {{ onEnter: () => void }} props
 */
export function DoneScreen({ onEnter }) {
  const t = useTranslations('auth')
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ec-successBg text-2xl text-ec-successTx">
        ✓
      </div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-ec-ink">{t('done.title')}</h1>
      <p className="max-w-xs text-[14px] font-medium text-ec-ink60">{t('done.trial')}</p>
      <button
        type="button"
        onClick={onEnter}
        className="h-13 w-full rounded-xl bg-ec-blue py-3.5 text-[15px] font-extrabold text-white shadow-ec-blue"
      >
        {t('done.enter')}
      </button>
    </div>
  )
}

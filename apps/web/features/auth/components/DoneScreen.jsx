'use client'

import { useTranslations } from 'next-intl'
import { ChevR } from '@/components/ui/icons'

/**
 * Onboarding final step — done / trial started (docs/design/SCREENS.md §1, prototype
 * login.jsx DoneStep). No backend call — the trial was created server-side at verify-otp.
 * "Enter EaseCab" routes to the feed; identity/profile is completed later at verification.
 * @param {{ onEnter: () => void }} props
 */
export function DoneScreen({ onEnter }) {
  const t = useTranslations('auth')
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-7 text-center">
      <div className="mb-[22px] flex h-[88px] w-[88px] animate-ec-pop items-center justify-center rounded-full bg-ec-successBg text-ec-success motion-reduce:animate-none">
        <svg
          viewBox="0 0 24 24"
          width={48}
          height={48}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* pathLength=1 normalises the dash so the tick draws itself after the pop */}
          <path
            d="M20 6 9 17l-5-5"
            pathLength="1"
            className="animate-ec-draw motion-reduce:animate-none"
            style={{ strokeDasharray: 1 }}
          />
        </svg>
      </div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-ec-ink">{t('done.title')}</h1>
      <p className="mt-2 max-w-[290px] text-[14.5px] leading-relaxed text-ec-ink60">{t('done.trial')}</p>
      <button
        type="button"
        onClick={onEnter}
        className="mt-7 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-ec-blue text-[16px] font-extrabold text-white shadow-ec-blue"
      >
        {t('done.enter')}
        <ChevR size={18} />
      </button>
    </div>
  )
}

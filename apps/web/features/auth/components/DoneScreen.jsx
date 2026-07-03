'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { SuccessBadge } from '@/components/ui/SuccessBadge'
import { ChevR } from '@/components/ui/icons'

/**
 * Onboarding final step — done / trial started (docs/design/SCREENS.md §1, prototype
 * login.jsx DoneStep). No backend call — the trial was created server-side at verify-otp.
 * "Enter EaseCab" routes to the feed; identity/profile is completed later at verification.
 * Badge pops + ring ripples + tick draws, then the copy and CTA rise in a stagger.
 * @param {{ onEnter: () => void }} props
 */
export function DoneScreen({ onEnter }) {
  const t = useTranslations('auth')
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-7 text-center">
      <div className="mb-[22px]">
        <SuccessBadge />
      </div>
      <h1 className="animate-ec-rise text-[24px] font-extrabold tracking-tight text-ec-ink motion-reduce:animate-none" style={{ animationDelay: '0.25s' }}>
        {t('done.title')}
      </h1>
      <p className="mt-2 max-w-[290px] animate-ec-rise text-[14.5px] leading-relaxed text-ec-ink60 motion-reduce:animate-none" style={{ animationDelay: '0.35s' }}>
        {t('done.trial')}
      </p>
      <div className="w-full animate-ec-rise motion-reduce:animate-none" style={{ animationDelay: '0.45s' }}>
        <Button type="button" size="lg" onClick={onEnter} className="mt-7 w-full">
          {t('done.enter')}
          <ChevR size={18} />
        </Button>
      </div>
    </div>
  )
}

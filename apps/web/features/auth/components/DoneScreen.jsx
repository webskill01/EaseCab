'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { SuccessBadge } from '@/components/ui/SuccessBadge'
import { ChevR } from '@/components/ui/icons'
import { ClaimReferrer } from '@/features/referrals/components/ClaimReferrer'
import { useReferrals } from '@/features/referrals/hooks/useReferrals'

/**
 * Onboarding final step — welcome (docs/design/SCREENS.md §1, prototype login.jsx
 * DoneStep). No backend call; new users start without a membership (no trial since 2026-10-13).
 * "Enter EaseCab" routes to the feed; identity/profile is completed later at verification.
 * New users can name who referred them here (Phase 22) — optional, also on /refer for 7 days.
 * Badge pops + ring ripples + tick draws, then the copy and CTA rise in a stagger.
 * @param {{ onEnter: () => void }} props
 */
export function DoneScreen({ onEnter }) {
  const t = useTranslations('auth')
  const { data: referrals } = useReferrals()
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-7 text-center">
      <div className="mb-[22px]">
        <SuccessBadge />
      </div>
      <h1 className="animate-ec-rise text-[24px] font-extrabold tracking-tight text-ec-ink motion-reduce:animate-none" style={{ animationDelay: '0.25s' }}>
        {t('done.title')}
      </h1>
      <p className="mt-2 max-w-[290px] animate-ec-rise text-[14.5px] leading-relaxed text-ec-ink60 motion-reduce:animate-none" style={{ animationDelay: '0.35s' }}>
        {t('done.welcome')}
      </p>
      <div className="w-full animate-ec-rise motion-reduce:animate-none" style={{ animationDelay: '0.45s' }}>
        {referrals?.enabled && referrals.canClaim && (
          <div className="mt-6 rounded-2xl bg-ec-bg p-3.5">
            <ClaimReferrer compact />
          </div>
        )}
        <Button type="button" size="lg" onClick={onEnter} className="mt-7 w-full">
          {t('done.enter')}
          <ChevR size={18} />
        </Button>
      </div>
    </div>
  )
}

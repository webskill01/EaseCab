'use client'

import { useTranslations } from 'next-intl'
import { Info } from '@/components/ui/icons'

/** One shimmering ride-card placeholder (chrome.jsx RideCardSkeleton). */
export function RideCardSkeleton() {
  const bar = 'animate-pulse rounded bg-ec-line'
  return (
    <div className="rounded-ec-card border border-ec-line bg-white p-3.5 shadow-ec-card">
      <div className="mb-3 flex items-center justify-between">
        <div className={`${bar} h-3 w-28`} />
        <div className={`${bar} h-5 w-16 rounded-full`} />
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex-1"><div className={`${bar} mb-2 h-2 w-12`} /><div className={`${bar} h-4 w-4/5`} /></div>
        <div className={`${bar} h-6 w-6 rounded-full`} />
        <div className="flex flex-1 flex-col items-end"><div className={`${bar} mb-2 h-2 w-10`} /><div className={`${bar} h-4 w-4/5`} /></div>
      </div>
      <div className="mt-3 border-t border-ec-line pt-3"><div className={`${bar} mb-2 h-3 w-2/3`} /><div className={`${bar} h-2.5 w-11/12`} /></div>
      <div className="mt-3 flex gap-1.5"><div className={`${bar} h-[42px] flex-1`} /><div className={`${bar} h-[42px] flex-1`} /><div className={`${bar} h-[42px] w-[42px]`} /></div>
    </div>
  )
}

/** "Live feed catching up…" degraded/empty state (chrome.jsx CatchingUp). */
export function CatchingUp() {
  const t = useTranslations('rides')
  return (
    <div className="my-2 flex items-center gap-3 rounded-ec-card border border-dashed border-ec-blue/40 bg-ec-sky p-4">
      <span className="h-[9px] w-[9px] shrink-0 animate-pulse rounded-full bg-ec-blue" />
      <div>
        <div className="text-[14px] font-extrabold text-ec-blueInk">{t('states.catchingUp')}</div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-ec-ink60">{t('states.catchingUpSub')}</div>
      </div>
    </div>
  )
}

/** Genuinely-empty feed (distinct from "catching up"). */
export function EmptyFeed() {
  const t = useTranslations('rides')
  return (
    <div className="my-6 flex flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ec-sky text-ec-blue"><Info size={22} /></div>
      <div className="text-[15px] font-extrabold text-ec-ink">{t('states.empty')}</div>
      <div className="max-w-[260px] text-[13px] font-medium text-ec-ink60">{t('states.emptySub')}</div>
    </div>
  )
}

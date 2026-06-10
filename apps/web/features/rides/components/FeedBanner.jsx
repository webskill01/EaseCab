'use client'

import { useTranslations } from 'next-intl'
import { Crown, Info } from '@/components/ui/icons'
import { MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'

/**
 * Membership banner (chrome.jsx FeedBanner): trial (with a days-left bar) / trial-
 * ending / expired. Hidden for an active paid member. `onUpgrade` routes to the
 * Membership screen (Step 21) — wired as a callback so the feed owns navigation.
 *
 * @param {{ membership: {state: string, daysLeft?: number, ending?: boolean}, onUpgrade: () => void }} props
 */
export function FeedBanner({ membership, onUpgrade }) {
  const t = useTranslations('rides')
  if (!membership || membership.state === MEMBERSHIP_STATE.ACTIVE) return null

  if (membership.state === MEMBERSHIP_STATE.EXPIRED) {
    return (
      <div className="bg-ec-bg px-4 pb-2 pt-1">
        <div className="flex items-center gap-3 rounded-ec-card border border-ec-danger/30 bg-ec-dangerBg px-3.5 py-3">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-ec-danger text-white"><Info size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-extrabold text-red-800">{t('banner.expiredTitle')}</div>
            <div className="mt-px text-[11.5px] font-semibold text-red-700">{t('banner.expiredSub')}</div>
          </div>
          <button type="button" onClick={onUpgrade} className="h-9 shrink-0 rounded-xl bg-ec-danger px-3.5 text-[13.5px] font-extrabold text-white">{t('banner.renew')}</button>
        </div>
      </div>
    )
  }

  const days = membership.daysLeft ?? 0
  const pct = Math.max(8, Math.min(100, (days / 7) * 100))
  return (
    <div className="bg-ec-bg px-4 pb-2 pt-1">
      <div className="rounded-ec-card border border-ec-warning/40 bg-ec-warnBg px-3.5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-ec-warning text-white"><Crown size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-extrabold text-amber-800">
              {membership.ending ? t('banner.trialEnding') : `${t('banner.freeTrial')} · ${days} ${t('banner.daysLeft')}`}
            </div>
            <div className="mt-px truncate text-[11.5px] font-semibold text-ec-amberTx">{t('banner.trialSub')}</div>
          </div>
          <button type="button" onClick={onUpgrade} className="h-9 shrink-0 rounded-xl bg-ec-blue px-3.5 text-[13.5px] font-extrabold text-white shadow-ec-blue">{t('banner.upgrade')}</button>
        </div>
        <div className="mt-3 h-[5px] overflow-hidden rounded-[3px] bg-amber-200">
          <div className="h-full rounded-[3px] bg-ec-warning" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

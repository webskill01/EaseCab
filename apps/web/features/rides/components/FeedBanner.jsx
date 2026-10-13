'use client'

import { useTranslations } from 'next-intl'
import { Info } from '@/components/ui/icons'
import { MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'

/**
 * Membership banner (chrome.jsx FeedBanner): expired-only. NONE (never subscribed),
 * ACTIVE and the loading state render nothing — the ₹149 prompt fires at the contact
 * action instead. `onUpgrade` routes to the Membership screen; the feed owns navigation.
 *
 * @param {{ membership: {state: ?string}, onUpgrade: () => void }} props
 */
export function FeedBanner({ membership, onUpgrade }) {
  const t = useTranslations('rides')
  if (membership?.state !== MEMBERSHIP_STATE.EXPIRED) return null

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

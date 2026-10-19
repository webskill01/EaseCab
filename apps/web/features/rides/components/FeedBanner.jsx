'use client'

import { useTranslations } from 'next-intl'
import { Info } from '@/components/ui/icons'
import { MEMBERSHIP_STATE, RENEWAL_BANNER_DAYS } from '@/features/subscription/lib/membership'

/** Colour set per banner variant (Tailwind classes must stay literal for the purge). */
const TONE = Object.freeze({
  join: { box: 'border-ec-blue/30 bg-ec-sky', icon: 'bg-ec-blue', title: 'text-ec-blueInk', sub: 'text-ec-ink60', btn: 'bg-ec-blue' },
  ending: { box: 'border-ec-warning/40 bg-ec-warnBg', icon: 'bg-ec-warning', title: 'text-amber-900', sub: 'text-ec-amberTx', btn: 'bg-ec-warning' },
  expired: { box: 'border-ec-danger/30 bg-ec-dangerBg', icon: 'bg-ec-danger', title: 'text-red-800', sub: 'text-red-700', btn: 'bg-ec-danger' },
})

/** Which banner (if any) this membership gets. null = render nothing. */
function bannerFor(membership, t) {
  const { state, daysLeft } = membership || {}
  if (state === MEMBERSHIP_STATE.NONE) {
    return { tone: TONE.join, title: t('banner.joinTitle'), sub: t('banner.joinSub'), cta: t('banner.join') }
  }
  if (state === MEMBERSHIP_STATE.EXPIRED) {
    return { tone: TONE.expired, title: t('banner.expiredTitle'), sub: t('banner.expiredSub'), cta: t('banner.renew') }
  }
  if (state === MEMBERSHIP_STATE.ACTIVE && daysLeft && daysLeft <= RENEWAL_BANNER_DAYS) {
    return { tone: TONE.ending, title: t('banner.endingTitle', { days: daysLeft }), sub: t('banner.endingSub'), cta: t('banner.renew') }
  }
  return null
}

/**
 * Membership banner on the feed — the main path to the Membership screen, since many
 * drivers never find it in Profile. NONE → "Become a member", EXPIRED → "Renew",
 * ACTIVE with ≤7 days left → "Ends in N days". Loading (state null) and comfortably
 * active render nothing. `onUpgrade` routes to the Membership screen.
 *
 * @param {{ membership: {state: ?string, daysLeft?: number}, onUpgrade: () => void }} props
 */
export function FeedBanner({ membership, onUpgrade }) {
  const t = useTranslations('rides')
  const b = bannerFor(membership, t)
  if (!b) return null

  return (
    <div className="bg-ec-bg px-4 pb-2 pt-1">
      <div className={`flex items-center gap-3 rounded-ec-card border px-3.5 py-3 ${b.tone.box}`}>
        <div className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-white ${b.tone.icon}`}><Info size={18} /></div>
        <div className="min-w-0 flex-1">
          <div className={`text-[14px] font-extrabold ${b.tone.title}`}>{b.title}</div>
          <div className={`mt-px text-[11.5px] font-semibold ${b.tone.sub}`}>{b.sub}</div>
        </div>
        <button type="button" onClick={onUpgrade} className={`h-9 shrink-0 rounded-xl px-3.5 text-[13.5px] font-extrabold text-white ${b.tone.btn}`}>{b.cta}</button>
      </div>
    </div>
  )
}

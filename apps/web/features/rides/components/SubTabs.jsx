'use client'

import { useTranslations } from 'next-intl'
import { Shield } from '@/components/ui/icons'
import { FEED_SUB } from '../hooks/useRidesFeed'

const BADGE_MAX = 99

/**
 * Rides / Verified Rides segmented toggle (chrome.jsx SubTabs). `dutiesCount` puts a
 * red live-count badge on the Driver Duties tab's top-right corner so drivers see there are duties to take.
 * @param {{ sub: string, onChange: (sub: string) => void, dutiesCount?: number }} props
 */
export function SubTabs({ sub, onChange, dutiesCount = 0 }) {
  const t = useTranslations('rides')
  const items = [
    [FEED_SUB.RIDES, t('tabs.rides'), false],
    [FEED_SUB.VERIFIED, t('tabs.verified'), true],
  ]
  return (
    <div className="bg-ec-bg px-4 py-2">
      <div className="flex gap-1 rounded-xl border border-ec-line bg-white p-1" role="tablist">
        {items.map(([key, label, withShield]) => {
          const on = sub === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(key)}
              className={`relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] text-[14px] font-bold transition-colors ${
                on ? 'bg-ec-blue text-white shadow-ec-blue' : 'bg-transparent text-ec-ink60'
              }`}
            >
              {withShield && <span className={`inline-flex ${on ? 'text-white' : 'text-ec-success'}`}><Shield size={14} /></span>}
              {label}
              {withShield && dutiesCount > 0 && (
                // App-icon style: pinned to the tab's top-right corner, white ring lifts it off the pill.
                <span className="absolute -right-1.5 -top-2 z-10 min-w-[20px] rounded-full bg-ec-danger px-1.5 text-center text-[11px] font-extrabold leading-5 text-white shadow-ec-card ring-2 ring-white">
                  {dutiesCount > BADGE_MAX ? `${BADGE_MAX}+` : dutiesCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

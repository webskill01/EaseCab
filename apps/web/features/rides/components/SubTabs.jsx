'use client'

import { useTranslations } from 'next-intl'
import { Shield } from '@/components/ui/icons'
import { FEED_SUB } from '../hooks/useRidesFeed'

/**
 * Rides / Verified Rides segmented toggle (chrome.jsx SubTabs).
 * @param {{ sub: string, onChange: (sub: string) => void }} props
 */
export function SubTabs({ sub, onChange }) {
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
              className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] text-[14px] font-bold transition-colors ${
                on ? 'bg-ec-blue text-white shadow-ec-blue' : 'bg-transparent text-ec-ink60'
              }`}
            >
              {withShield && <span className={`inline-flex ${on ? 'text-white' : 'text-ec-success'}`}><Shield size={14} /></span>}
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

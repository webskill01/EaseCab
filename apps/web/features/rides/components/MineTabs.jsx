'use client'

import { useTranslations } from 'next-intl'

/** Posted | Contacted segmented toggle (mirrors SubTabs chrome, My-Rides scope). */
export const MINE_SUB = Object.freeze({ POSTED: 'posted', CONTACTED: 'contacted' })

export function MineTabs({ sub, onChange }) {
  const t = useTranslations('mine')
  const items = [[MINE_SUB.POSTED, t('tabs.posted')], [MINE_SUB.CONTACTED, t('tabs.contacted')]]
  return (
    <div className="bg-ec-bg px-4 py-2">
      <div className="flex gap-1 rounded-xl border border-ec-line bg-white p-1" role="tablist">
        {items.map(([key, label]) => {
          const on = sub === key
          return (
            <button key={key} type="button" role="tab" aria-selected={on} onClick={() => onChange(key)}
              className={`flex h-10 flex-1 items-center justify-center rounded-[9px] text-[14px] font-bold transition-colors ${on ? 'bg-ec-blue text-white shadow-ec-blue' : 'bg-transparent text-ec-ink60'}`}>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

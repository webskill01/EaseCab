'use client'

import { useTranslations } from 'next-intl'
import { Pin } from '@/components/ui/icons'

/**
 * Strip under the sub-tabs. A city lock gets a loud amber bar naming the cities + a
 * one-tap clear (the blue trigger alone was easy to miss, so users thought rides were
 * missing). Otherwise the live tab carries a quiet "auto-updating" note so nobody
 * pull-refreshes a feed that's already SSE-driven.
 * @param {{ selected: {id: string, name: string}[], live: boolean, onClear: () => void }} props
 */
export function FeedStatus({ selected, live, onClear }) {
  const t = useTranslations('rides')
  if (selected.length > 0) {
    return (
      <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-ec-warning/40 bg-ec-warnBg px-3 py-2">
        <span className="shrink-0 text-ec-warning"><Pin size={15} /></span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ec-amberTx">
          {t('filter.showingOnly', { cities: selected.map((c) => c.name).join(', ') })}
        </span>
        <button type="button" onClick={onClear} className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[12px] font-extrabold text-ec-blue">
          {t('filter.clear')}
        </button>
      </div>
    )
  }
  if (!live) return null
  return (
    <p className="mx-4 mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-ec-ink60">
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ec-success motion-reduce:animate-none" />
      {t('feed.liveNote')}
    </p>
  )
}

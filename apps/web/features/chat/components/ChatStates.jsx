'use client'

import { useTranslations } from 'next-intl'

/** Loading skeleton for the chat list. */
export function ListSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[64px] animate-pulse rounded-ec-card bg-ec-bg" />
      ))}
    </div>
  )
}

/** Empty chat list. */
export function EmptyList() {
  const t = useTranslations('chat')
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <p className="text-[15px] font-extrabold text-ec-ink">{t('list.empty')}</p>
      <p className="mt-1 text-[13px] font-semibold text-ec-ink60">{t('list.emptyHint')}</p>
    </div>
  )
}

/** Empty thread (no messages yet). */
export function EmptyThread() {
  const t = useTranslations('chat')
  return (
    <div className="flex flex-1 items-center justify-center px-8 text-center text-[13px] font-semibold text-ec-ink60">
      {t('thread.empty')}
    </div>
  )
}

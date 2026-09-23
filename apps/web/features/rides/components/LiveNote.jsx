'use client'

import { useTranslations } from 'next-intl'

/** "Feed updates automatically" note — first item INSIDE the scroll list, so it's seen
 * at the top and scrolls away with the rides instead of pinning above them. */
export function LiveNote() {
  const t = useTranslations('rides')
  return (
    <p className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-ec-ink60">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ec-success" />
      {t('feed.liveNote')}
    </p>
  )
}

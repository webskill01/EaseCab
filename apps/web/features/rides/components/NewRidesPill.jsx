'use client'

import { useTranslations } from 'next-intl'
import { ChevR } from '@/components/ui/icons'

/**
 * Sticky "N new rides" pill — appears when live rides are queued while the user is
 * scrolled down; tapping flushes them and jumps to the top (chrome.jsx NewRidesPill).
 * @param {{ count: number, onClick: () => void }} props
 */
export function NewRidesPill({ count, onClick }) {
  const t = useTranslations('rides')
  if (!count) return null
  return (
    <div className="pointer-events-none sticky top-1 z-10 flex h-0 justify-center">
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto inline-flex h-[38px] items-center gap-1.5 rounded-ec-chip bg-ec-blue px-4 text-[13px] font-extrabold text-white shadow-ec-blue"
      >
        <span className="inline-flex -rotate-90"><ChevR size={15} /></span>
        {count} {t('pill.newRides')}
      </button>
    </div>
  )
}

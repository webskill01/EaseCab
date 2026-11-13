'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { BellEdit, Warning } from '@/components/ui/icons'
import { alertProblem } from '@/features/notifications/lib/pushFlow'

// Re-check when the driver comes back from phone settings.
const onFocus = (cb) => { window.addEventListener('focus', cb); return () => window.removeEventListener('focus', cb) }

/**
 * Feed's Notifications button. When alerts are blocked, muted or battery-limited, a small
 * warning chip sits on its top edge so the driver sees where to fix it (the screen it opens
 * holds the fix rows).
 * @param {{ onClick: () => void }} props
 */
export function NotificationsButton({ onClick }) {
  const t = useTranslations('rides')
  const problem = useSyncExternalStore(onFocus, alertProblem, () => null)
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ec-line bg-white text-[14px] font-bold text-ec-blueInk shadow-ec-card"
    >
      <span className="inline-flex text-ec-blue"><BellEdit size={18} /></span>{t('filter.notifications')}
      {problem && (
        <span className="absolute -top-2 right-2 flex items-center gap-1 rounded-full bg-ec-danger px-2 py-px text-[10.5px] font-extrabold text-white shadow-ec-card">
          <Warning size={11} />{t(`filter.alert.${problem}`)}
        </span>
      )}
    </button>
  )
}

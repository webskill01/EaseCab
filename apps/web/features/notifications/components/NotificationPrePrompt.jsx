'use client'

import { useTranslations } from 'next-intl'
import { BellEdit } from '@/components/ui/icons'

/**
 * In-feed soft pre-prompt (Step 23, SCREENS §2). Shown after ~3 rides viewed; its
 * CTA fires the real OS Notification prompt via the parent's onEnable. Dismissal is
 * persisted by the parent so it never nags again.
 */
export function NotificationPrePrompt({ onEnable, onDismiss, enabling }) {
  const t = useTranslations('notifications')
  return (
    <div className="rounded-2xl border border-ec-line bg-white p-4 shadow-ec-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ec-sky text-ec-blue"><BellEdit size={20} /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold text-ec-ink">{t('prePrompt.title')}</p>
          <p className="mt-0.5 text-[13px] font-medium text-ec-ink60">{t('prePrompt.body')}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onDismiss} className="h-11 flex-1 rounded-xl border-[1.5px] border-ec-line text-[14px] font-bold text-ec-ink60">{t('prePrompt.notNow')}</button>
        <button type="button" onClick={onEnable} disabled={enabling} className="h-11 flex-1 rounded-xl bg-ec-blue text-[14px] font-extrabold text-white shadow-ec-blue disabled:opacity-60">{t('prePrompt.enable')}</button>
      </div>
    </div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { Info, ChevR } from '@/components/ui/icons'

/**
 * Complete-profile banner (handoff §3②) — only when profileComplete is false.
 * Full-width button: amber icon tile + nudge copy + chevron → onAction (Verification).
 */
export function CompletenessBanner({ onAction }) {
  const t = useTranslations('profile')
  return (
    <button
      type="button"
      onClick={onAction}
      className="flex w-full items-center gap-3 rounded-2xl border border-ec-warning/40 bg-ec-warnBg px-3.5 py-3 text-left"
    >
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-ec-warning text-white"><Info size={18} /></span>
      <span className="flex-1 text-[13px] font-bold leading-snug text-ec-amberTx">{t('completeness.title')}</span>
      <ChevR size={18} className="shrink-0 text-ec-amberTx" />
    </button>
  )
}

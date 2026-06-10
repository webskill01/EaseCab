'use client'

import { useTranslations } from 'next-intl'
import { Headset } from '@/components/ui/icons'

/**
 * Top-bar Support button (chrome.jsx TopBar). The support flow (WhatsApp/help) is a
 * later step — the button is present per the locked chrome; its action is wired then.
 */
export function SupportButton() {
  const t = useTranslations('common')
  return (
    <button
      type="button"
      aria-label={t('shell.support')}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-ec-blueInk"
    >
      <Headset size={18} />
    </button>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { Headset } from '@/components/ui/icons'
import { env } from '@/config/env'

/**
 * Build the support deep-link: prefer WhatsApp (the product's primary channel,
 * chrome.jsx), fall back to email. Returned target is opened in a new tab.
 */
function supportHref() {
  if (env.NEXT_PUBLIC_SUPPORT_WHATSAPP) {
    return `https://wa.me/${env.NEXT_PUBLIC_SUPPORT_WHATSAPP}`
  }
  return `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`
}

/**
 * Top-bar Support button (chrome.jsx TopBar). Opens the support channel —
 * WhatsApp when a support number is configured, otherwise a support email.
 */
export function SupportButton() {
  const t = useTranslations('common')
  return (
    <a
      href={supportHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('shell.support')}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-ec-blueInk"
    >
      <Headset size={18} />
    </a>
  )
}

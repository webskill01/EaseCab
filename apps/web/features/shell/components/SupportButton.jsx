'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { SUPPORT_HOURS } from '@easecab/shared'
import { StatusSheet } from '@/components/ui/StatusSheet'
import { Button } from '@/components/ui/button'
import { Headset } from '@/components/ui/icons'
import { env } from '@/config/env'

const CLOSED_EVENT = 'ec:support-closed'

/**
 * Build the support deep-link: prefer WhatsApp (the product's primary channel,
 * chrome.jsx), fall back to email. Returned target is opened in a new tab.
 */
export function supportHref() {
  if (env.NEXT_PUBLIC_SUPPORT_WHATSAPP) {
    return `https://wa.me/${env.NEXT_PUBLIC_SUPPORT_WHATSAPP}`
  }
  return `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`
}

/** True inside support hours (IST), whatever the phone's own time zone. */
export function supportOpenNow(at = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: SUPPORT_HOURS.TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(at))
  return h >= SUPPORT_HOURS.START_HOUR && h < SUPPORT_HOURS.END_HOUR
}

/**
 * onClick for every support link: inside hours the link opens as usual; outside, the
 * chat is not opened and the hours popup (SupportHoursSheet, mounted once in the app
 * layout) shows instead.
 */
export function guardSupport(e) {
  if (supportOpenNow()) return
  e.preventDefault()
  window.dispatchEvent(new Event(CLOSED_EVENT))
}

/** "Support is available 9 AM – 5 PM" popup; one instance listens for guardSupport. */
export function SupportHoursSheet() {
  const t = useTranslations('common.supportHours')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(CLOSED_EVENT, show)
    return () => window.removeEventListener(CLOSED_EVENT, show)
  }, [])
  if (!open) return null
  return (
    <StatusSheet tone="info" icon={<Headset size={24} />} title={t('title')} body={t('body')} onClose={() => setOpen(false)}>
      <Button type="button" size="lg" className="w-full" onClick={() => setOpen(false)}>{t('ok')}</Button>
    </StatusSheet>
  )
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
      onClick={guardSupport}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 text-ec-blueInk"
    >
      <Headset size={18} />
      <span className="text-[10px] font-bold leading-none">{t('shell.support')}</span>
    </a>
  )
}

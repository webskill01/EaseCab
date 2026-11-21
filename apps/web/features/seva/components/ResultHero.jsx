'use client'

import { useTranslations } from 'next-intl'
import { Check, CircleX, Ban, Bank, CalendarCheck, Warning, Car, Timer, Lock } from '@/components/ui/icons'

/** kind → [icon, circle colours]. success = green, stop = red, heads-up = amber, neutral = sky. */
const LOOK = {
  paid: [Check, 'bg-ec-successBg text-ec-success ring-ec-successBg/50'],
  linkEnded: [Bank, 'bg-ec-sky text-ec-blueInk ring-ec-sky/60'],
  cancelled: [Ban, 'bg-ec-sky text-ec-blueInk ring-ec-sky/60'],
  declined: [Ban, 'bg-ec-sky text-ec-blueInk ring-ec-sky/60'],
  alreadyPaid: [CalendarCheck, 'bg-ec-sky text-ec-blueInk ring-ec-sky/60'],
  code: [Timer, 'bg-ec-sky text-ec-blueInk ring-ec-sky/60'],
  siteDown: [Warning, 'bg-ec-warnBg text-ec-amberTx ring-ec-warnBg/60'],
  locked: [Lock, 'bg-ec-warnBg text-ec-amberTx ring-ec-warnBg/60'],
  vehicle: [Car, 'bg-ec-dangerBg text-ec-danger ring-ec-dangerBg/50'],
  payment: [CircleX, 'bg-ec-dangerBg text-ec-danger ring-ec-dangerBg/50'],
  error: [CircleX, 'bg-ec-dangerBg text-ec-danger ring-ec-dangerBg/50'],
}

/**
 * Centred result header for finished filings: round icon, short title, one-line reason,
 * optional "no money charged" chip.
 * @param {{ kind: string, title: string, message?: string, noCharge?: boolean }} props
 */
export function ResultHero({ kind, title, message, noCharge }) {
  const t = useTranslations('seva')
  const [Icon, look] = LOOK[kind] || LOOK.error
  return (
    <div className="flex flex-col items-center pb-4 pt-2 text-center animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">
      <span className={`flex h-16 w-16 items-center justify-center rounded-full ring-8 ${look}`}><Icon size={28} /></span>
      <h2 className="mt-5 text-[20px] font-extrabold leading-tight tracking-tight text-ec-ink">{title}</h2>
      {message && <p className="mt-1.5 max-w-[32ch] text-[14px] font-medium leading-snug text-ec-ink60">{message}</p>}
      {noCharge && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ec-successBg px-3 py-1 text-[12.5px] font-bold text-ec-successTx">
          <Check size={14} /> {t('bt.result.noCharge')}
        </span>
      )}
    </div>
  )
}

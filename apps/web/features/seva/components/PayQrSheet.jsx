'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { buttonVariants } from '@/components/ui/button'
import { useSecondsLeft } from '../hooks/useBorderTax'
import { fmtClock, rupees } from '../lib/borderTax'

/**
 * In-app UPI QR (HR): the bot's browser sits on the govt's PayU page; the driver pays from a UPI app
 * (tap on this phone, or scan from another) and the bot fetches the receipt once PayU confirms.
 * @param {{ f: object, onClose: () => void }} props
 */
export function PayQrSheet({ f, onClose }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const left = useSecondsLeft(f.live?.deadline)
  const amount = rupees(f.taxPaise)
  return (
    <BottomSheet closeLabel={tc('actions.close')} onClose={onClose} label={t('bt.qr.title')}>
      <h2 className="mb-1 text-[20px] font-extrabold tracking-tight text-ec-ink">{t('bt.qr.title')}</h2>
      <p className="mb-4 text-[28px] font-extrabold text-ec-blueInk">{amount}</p>
      <div className="flex flex-col items-center gap-3 pb-2">
        {/[?&]am=/.test(f.live?.upi || '') && ( /* a link without the amount (seen live 2026-11-11: pa only) won't match the govt order */
          <a href={f.live.upi} className={`${buttonVariants({ size: 'lg' })} w-full`}>{t('bt.qr.upiCta', { amount })}</a>
        )}
        {f.live?.qr && (
          <Image src={f.live.qr} alt={t('bt.qr.alt')} width={220} height={220} unoptimized className="rounded-xl border border-ec-line bg-white p-2" />
        )}
        <p className="text-center text-[13px] font-medium text-ec-ink60">{t('bt.qr.scan')}</p>
        {left !== null && <p className="text-[14px] font-bold tabular-nums text-ec-blueInk">{t('bt.qr.timer', { time: fmtClock(left) })}</p>}
        <p className="rounded-xl bg-ec-sky px-4 py-3 text-center text-[12.5px] font-semibold leading-snug text-ec-blueInk">{t('bt.qr.wait')}</p>
      </div>
    </BottomSheet>
  )
}

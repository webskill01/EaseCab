'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/icons'
import { useSecondsLeft } from '../hooks/useBorderTax'
import { BT_STATES, fmtClock, rupees } from '../lib/borderTax'

/**
 * In-app UPI QR: the bot's browser sits on the govt's PayU page; the driver pays from a UPI app
 * (scan from another phone, or tap to pay on this one) and the bot fetches the receipt once PayU confirms.
 * Amount → QR → pay button, centred. Once the QR's timer runs out it is hidden: the bot still listens a
 * little longer (a scan at 4:59 still reports back), then the filing turns into its result.
 * @param {{ f: object, onClose: () => void }} props
 */
export function PayQrSheet({ f, onClose }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const left = useSecondsLeft(f.live?.deadline)
  const expired = left === 0
  const amount = rupees(f.taxPaise)
  const upi = /[?&]am=/.test(f.live?.upi || '') // a link without the amount (seen live 2026-11-11: pa only) won't match the govt order
  return (
    <BottomSheet closeLabel={tc('actions.close')} onClose={onClose} label={t('bt.qr.title')}>
      <div className="flex flex-col items-center gap-4 pb-2 text-center">
        <div>
          <h2 className="text-[16px] font-extrabold tracking-tight text-ec-ink60">{t('bt.qr.title')}</h2>
          <p className="mt-1 text-[36px] font-extrabold leading-none tracking-tight tabular-nums text-ec-blueInk">{amount}</p>
          <p className="mt-2 text-[13px] font-semibold text-ec-ink60">{f.vehicleNo} • {BT_STATES[f.stateCd]?.name || f.stateCd}</p>
        </div>
        {expired ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-ec-card bg-ec-bg px-4 py-8" role="status">
            <Spinner size={28} />
            <p className="text-[14px] font-bold text-ec-ink">{t('bt.qr.expired')}</p>
          </div>
        ) : (
          <>
            {f.live?.qr && (
              <div className="rounded-2xl border border-ec-line bg-white p-3 shadow-ec-card">
                <Image src={f.live.qr} alt={t('bt.qr.alt')} width={220} height={220} unoptimized className="block" />
              </div>
            )}
            {left !== null && <p className="text-[14px] font-bold tabular-nums text-ec-blueInk">{t('bt.qr.timer', { time: fmtClock(left) })}</p>}
            {upi && <a href={f.live.upi} className={`${buttonVariants({ size: 'lg' })} w-full`}>{t('bt.qr.upiCta', { amount })}</a>}
            <p className="text-[12.5px] font-medium text-ec-ink60">{t('bt.qr.scan')}</p>
          </>
        )}
        <p className="w-full rounded-xl bg-ec-sky px-4 py-3 text-[12.5px] font-semibold leading-snug text-ec-blueInk">{t('bt.qr.wait')}</p>
      </div>
    </BottomSheet>
  )
}

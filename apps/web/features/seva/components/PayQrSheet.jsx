'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { buttonVariants } from '@/components/ui/button'
import { Spinner, Timer, Warning } from '@/components/ui/icons'
import { useSecondsLeft } from '../hooks/useBorderTax'
import { BT_STATES, fmtClock, fmtWhen, rupees, isDaysMode, daysOf } from '../lib/borderTax'

/**
 * In-app UPI QR (CabsWale layout): QR card + Pay button → "Complete your payment" → timer → summary →
 * pay-before-timer warning. The bot's browser sits on the govt payment page; the driver pays from a UPI
 * app and the bot fetches the receipt once the bank confirms. Once the timer runs out the QR is hidden:
 * the bot still listens a little longer (a scan at 4:59 still reports back), then the filing turns into its result.
 * @param {{ f: object, onClose: () => void }} props
 */
export function PayQrSheet({ f, onClose }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const left = useSecondsLeft(f.live?.deadline)
  const expired = left === 0
  const amount = rupees(f.taxPaise)
  const from = fmtWhen(f.taxFrom)
  const upto = fmtWhen(f.taxUpto)
  const upi = /[?&]am=/.test(f.live?.upi || '') // a link without the amount (seen live 2026-11-11: pa only) won't match the govt order
  return (
    <BottomSheet closeLabel={tc('actions.close')} onClose={onClose} label={t('bt.qr.title')}>
      <div className="flex flex-col gap-4 pb-2 text-center">
        <h2 className="text-[17px] font-extrabold tracking-tight text-ec-ink">{t('bt.qr.title')}</h2>
        {expired ? (
          <div className="flex flex-col items-center gap-3 rounded-ec-card bg-ec-bg px-4 py-8" role="status">
            <Spinner size={28} />
            <p className="text-[14px] font-bold text-ec-ink">{t(f.live?.step === 'verifying' ? 'bt.qr.verifying' : 'bt.qr.expired')}</p>
            <p className="text-[12.5px] font-semibold leading-snug text-ec-ink60">{t('bt.qr.noRepay')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card">
            {f.live?.qr && <Image src={f.live.qr} alt={t('bt.qr.alt')} width={220} height={220} unoptimized className="block" />}
            <p className="text-[12px] font-bold uppercase tracking-wide text-ec-blueInk">{t('bt.qr.scanCaps')}</p>
            {upi && <a href={f.live.upi} className={`${buttonVariants({ size: 'lg' })} w-full text-[16px]`}>{t('bt.qr.upiCta', { amount })}</a>}
          </div>
        )}
        {!expired && (
          <>
            <div>
              <p className="text-[20px] font-extrabold tracking-tight text-ec-ink">{t('bt.qr.complete')}</p>
              <p className="text-[13px] font-medium text-ec-ink60">{t('bt.qr.scan')}</p>
            </div>
            {left !== null && (
              <div className="rounded-ec-card bg-amber-100 px-4 py-3" role="timer">
                <p className="text-[11.5px] font-bold uppercase tracking-wide text-ec-amberTx">{t('bt.qr.windowEnds')}</p>
                <p className="mt-1 flex items-center justify-center gap-2 text-[30px] font-extrabold leading-none tabular-nums text-ec-danger"><Timer />{fmtClock(left)}</p>
              </div>
            )}
          </>
        )}
        <div className="rounded-ec-card border border-ec-line bg-white px-4 py-3.5 text-left">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[22px] font-extrabold tabular-nums text-ec-ink">{amount}</p>
            <span className="rounded-lg border border-ec-line bg-ec-sky px-2.5 py-1 text-[13px] font-extrabold tracking-wide text-ec-blueInk">{f.vehicleNo}</span>
          </div>
          <p className="mt-1 text-[13px] font-bold uppercase text-ec-ink60">
            {BT_STATES[f.stateCd]?.name || f.stateCd} • <span className="normal-case">{isDaysMode(f) ? t('bt.dayCount', { n: daysOf(f) }) : t(`bt.modes.${f.taxMode}`)}</span>
          </p>
          <p className="mt-1 text-[12.5px] font-bold text-ec-blueInk">{t('bt.prep.validity', { from: `${from.date}, ${from.time}`, to: `${upto.date}, ${upto.time}` })}</p>
        </div>
        {!expired && (
          <div className="flex gap-3 rounded-ec-card border border-amber-200 bg-ec-warnBg px-4 py-3 text-left">
            <span className="mt-0.5 shrink-0 text-ec-warning"><Warning size={20} /></span>
            <div>
              <p className="text-[14px] font-extrabold text-ec-ink">{t('bt.qr.beforeT')}</p>
              <p className="mt-0.5 text-[12.5px] font-medium leading-snug text-ec-ink60">{t('bt.qr.beforeS')}</p>
            </div>
          </div>
        )}
        <p className="rounded-xl bg-ec-sky px-4 py-3 text-[12.5px] font-semibold leading-snug text-ec-blueInk">{t('bt.qr.wait')}</p>
      </div>
    </BottomSheet>
  )
}

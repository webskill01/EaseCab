'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { supportHref } from '@/features/shell/components/SupportButton'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button, buttonVariants } from '@/components/ui/button'
import { Bank, External, CircleX, Ban, Car, Headset, Receipt } from '@/components/ui/icons'
import { useFiling, useReceiptUrl, useBorderTaxActions } from '../hooks/useBorderTax'
import { BT_STATUS as S, BT_STATES, markPayOpened, BT_FAIL_NO_RETRY, isFinal, daysOf, isDaysMode, fmtWhen, rupees, submitHandoff, gettingReceipt, receiptGoneAt, receiptGone, canUnlock, BT_UNLOCK } from '../lib/borderTax'
import { PreparingScreen } from './PreparingScreen'
import { PayQrSheet } from './PayQrSheet'

/** "Payment Details" (CabsWale): vehicle, state • days, validity, tax, amount payable → pay in a new tab. */
function PaymentSheet({ f, onClose }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const from = fmtWhen(f.taxFrom)
  const upto = fmtWhen(f.taxUpto)
  const amount = rupees(f.taxPaise)
  return (
    <BottomSheet closeLabel={tc('actions.close')} onClose={onClose} label={t('bt.pay.title')}>
      <h2 className="mb-4 text-[20px] font-extrabold tracking-tight text-ec-ink">{t('bt.pay.title')}</h2>
      <div className="flex flex-col gap-3 pb-2">
        <div className="rounded-ec-card border border-ec-line px-4 py-4">
          <div className="flex gap-3 border-b border-ec-line pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ec-sky text-ec-blueInk"><Car size={20} /></span>
            <div className="min-w-0">
              <p className="text-[17px] font-extrabold text-ec-ink">{f.vehicleNo}</p>
              <p className="text-[14px] font-medium text-ec-ink60">{BT_STATES[f.stateCd]?.name || f.stateCd} • {isDaysMode(f) ? t('bt.dayCount', { n: daysOf(f) }) : t(`bt.modes.${f.taxMode}`)}</p>
              <p className="text-[12.5px] font-bold text-ec-blueInk">{t('bt.prep.validity', { from: `${from.date}, ${from.time}`, to: `${upto.date}, ${upto.time}` })}</p>
            </div>
          </div>
          <div className="flex justify-between py-3 text-[14.5px]">
            <span className="font-medium text-ec-ink60">{t('bt.pay.tax')}</span>
            <span className="font-extrabold text-ec-ink">{amount}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-ec-blueInk px-4 py-3 text-[15px] font-extrabold text-white">
            <span>{t('bt.pay.payable')}</span><span>{amount}</span>
          </div>
        </div>
        <Button type="button" size="lg" className="w-full gap-2" onClick={() => { submitHandoff(f.live.handoff); markPayOpened(f.id); onClose() }}>
          {t('bt.pay.cta', { amount })} <External />
        </Button>
        <p className="text-center text-[12px] font-medium leading-snug text-ec-ink60">{t('bt.pay.note')}</p>
      </div>
    </BottomSheet>
  )
}

/** Header (icon, tone, title, sub) for a finished filing. */
function head(f, t) {
  if (f.status === S.HANDED_OFF) return [<Bank key="i" size={22} />, 'sky', t('bt.live.closedTitle'), t('bt.live.closedSub')]
  if (f.status === S.PAID) return [<Receipt key="i" size={22} />, 'success', t('bt.status.paid.t'), f.receiptNo ? t('bt.qr.receiptNo', { no: f.receiptNo }) : gettingReceipt(f) ? t('bt.qr.gettingReceipt') : t('bt.qr.noReceipt')]
  if (f.status === S.CANCELLED) return [<Ban key="i" size={22} />, 'sky', t('bt.status.cancelled.t'), t('bt.status.cancelled.s')]
  return [<CircleX key="i" size={22} />, 'danger', t(`bt.status.${f.status}.t`), t(`bt.fail.${f.failureCode || 'portal_error'}`)]
}

/** Pending-lock clear: status line + "Clear lock" (vehicle_pending only). */
function UnlockBox({ f }) {
  const t = useTranslations('seva')
  const { unlock } = useBorderTaxActions()
  const u = f.unlock
  if (!u && !canUnlock(f)) return null
  const at = fmtWhen(u?.at)
  return (
    <>
      {u && <p className="rounded-xl bg-ec-bg px-3 py-2 text-center text-[13px] font-semibold text-ec-ink60" role="status">{t(`bt.unlock.${u.status}`, { time: at.time, no: u.receiptNo || '' })}</p>}
      {canUnlock(f) && (
        <Button type="button" size="lg" variant="outline" className="w-full" disabled={unlock.isPending} onClick={() => unlock.mutate(f.id)}>
          {unlock.isPending ? t('bt.unlock.sending') : t('bt.unlock.button')}
        </Button>
      )}
      {unlock.isError && <p className="text-center text-[12.5px] font-semibold text-ec-danger">{t('bt.unlock.error')}</p>}
    </>
  )
}

/** Finished filing: payment link ended / failed / timed out / cancelled — what now. */
function ResultSheet({ f, onClose, onRetry }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const [icon, tone, title, sub] = head(f, t)
  const failed = f.status === S.FAILED || f.status === S.EXPIRED
  const paid = f.status === S.PAID
  const fetching = gettingReceipt(f)
  const goneAt = receiptGoneAt(f)
  const gone = receiptGone(f) // PDF deleted by the worker sweep
  const receipt = useReceiptUrl(f.id, paid && Boolean(f.receiptNo) && !fetching && !gone) // not mid-lookup: a 404 then would stick
  const receiptUrl = receipt.data
  const goneWhen = fmtWhen(goneAt)
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={title}>
      <SheetTitle icon={icon} tone={tone} title={title} sub={sub} />
      <div className="flex flex-col gap-3 pb-2">
        {receiptUrl && (
          <a href={receiptUrl} download className={`${buttonVariants({ size: 'lg' })} w-full gap-2`}>
            <Receipt size={18} /> {t('bt.qr.download')}
          </a>
        )}
        {receiptUrl && <p className="text-center text-[12.5px] font-semibold text-ec-ink60">{t('bt.qr.saveHint', { date: goneWhen.date, time: goneWhen.time })}</p>}
        {gone && <p className="rounded-xl bg-ec-bg px-3 py-2 text-center text-[13px] font-semibold text-ec-ink60">{t('bt.qr.receiptGone')}</p>}
        {(failed || f.status === S.HANDED_OFF) && <UnlockBox f={f} />}
        {(failed || (paid && !fetching && !gone && (!f.receiptNo || receipt.isError))) && (
          <>
            {failed && !BT_FAIL_NO_RETRY.includes(f.failureCode) && (!f.unlock || f.unlock.status === BT_UNLOCK.CLEARED) && (
              <Button type="button" size="lg" className="w-full" onClick={() => onRetry(f)}>{t('bt.live.retry')}</Button>
            )}
            <a href={supportHref()} target="_blank" rel="noopener noreferrer" className={`${buttonVariants({ variant: 'outline', size: 'lg' })} w-full gap-2`}>
              <Headset size={18} /> {t('bt.live.support')}
            </a>
          </>
        )}
        <Button type="button" variant={failed ? 'ghost' : 'outline'} size="lg" className="w-full" onClick={onClose}>{tc('actions.close')}</Button>
      </div>
    </BottomSheet>
  )
}

/**
 * One filing, polled: running → full-screen preparing; payment page ready → Payment Details;
 * anything else → the result.
 * @param {{ id: string, seed?: object, onClose: () => void, onRetry: (filing: object) => void }} props
 */
export function FilingSheet({ id, seed, onClose, onRetry }) {
  const { data } = useFiling(id)
  const f = data ?? (seed?.id === id ? seed : null) // just created: show the preparing screen before the first poll
  if (!f) return null
  if (f.status === S.AWAITING_PAYMENT) return <PayQrSheet f={f} onClose={onClose} />
  if (!isFinal(f.status)) return <PreparingScreen f={f} onBack={onClose} />
  if (f.status === S.HANDED_OFF && f.live?.handoff) return <PaymentSheet f={f} onClose={onClose} />
  return <ResultSheet f={f} onClose={onClose} onRetry={onRetry} />
}

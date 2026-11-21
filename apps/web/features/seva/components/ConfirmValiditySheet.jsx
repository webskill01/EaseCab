'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { CalendarCheck, ArrowR } from '@/components/ui/icons'
import { BT_STATES, isDaysMode, validUpto, fmtWhen, ownFee, rupees } from '../lib/borderTax'
import { useFilings } from '../hooks/useBorderTax'

/**
 * "Confirm your pass validity" (CabsWale): start → valid upto, plan, amount; Change date / Continue.
 * Amount is this cab's own last fee for the same days (ownFee); otherwise the govt site shows it.
 * @param {{ form: object, onChange: () => void, onContinue: () => void }} props
 */
export function ConfirmValiditySheet({ form, onChange, onContinue }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const daysMode = isDaysMode(form)
  const from = fmtWhen(new Date(form.startAt))
  const upto = fmtWhen(validUpto(form.startAt, form.days, BT_STATES[form.stateCd]?.calendarDays))
  const filings = useFilings().data
  const fee = daysMode ? ownFee(filings, form) : null
  const amount = fee ? rupees(fee) : null
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onChange} label={t('bt.confirm.title')}>
      <div className="flex flex-col items-center gap-4 pb-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ec-successBg text-ec-success"><CalendarCheck size={28} /></span>
        <div>
          <h2 className="text-[19px] font-extrabold tracking-tight text-ec-ink">{t('bt.confirm.title')}</h2>
          <p className="mt-1 text-[13px] font-medium leading-snug text-ec-ink60">{t('bt.confirm.sub')}</p>
        </div>
        <div className="flex w-full items-center gap-2 rounded-2xl bg-ec-sky px-3 py-3.5">
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ec-ink60">{t('bt.confirm.start')}</p>
            <p className="text-[15px] font-extrabold text-ec-ink">{from.date}</p>
            <p className="text-[12.5px] font-semibold text-ec-ink60">{from.time}</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ec-blueInk"><ArrowR size={16} /></span>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ec-ink60">{t('bt.confirm.upto')}</p>
            <p className="text-[15px] font-extrabold text-ec-blue">{daysMode ? upto.date : t(`bt.modes.${form.taxMode}`)}</p>
            {daysMode && <p className="text-[12.5px] font-semibold text-ec-blue">{upto.time}</p>}
          </div>
        </div>
        <div className="w-full divide-y divide-ec-line rounded-2xl bg-ec-bg px-4 text-[14px]">
          <div className="flex justify-between py-3">
            <span className="font-medium text-ec-ink60">{t('bt.confirm.plan')}</span>
            <span className="font-extrabold text-ec-ink">{daysMode ? t('bt.dayCount', { n: form.days }) : t(`bt.modes.${form.taxMode}`)}</span>
          </div>
          <div className="flex justify-between gap-3 py-3">
            <span className="font-medium text-ec-ink60">{t('bt.confirm.amount')}</span>
            <span className="text-right font-extrabold text-ec-ink">{amount || t('bt.confirm.amountLater')}</span>
          </div>
        </div>
        <div className="flex w-full gap-3">
          <Button type="button" size="lg" variant="outline" className="flex-1" onClick={onChange}>{t('bt.confirm.change')}</Button>
          <Button type="button" size="lg" className="flex-1" onClick={onContinue}>{t('bt.confirm.continue')}</Button>
        </div>
      </div>
    </BottomSheet>
  )
}

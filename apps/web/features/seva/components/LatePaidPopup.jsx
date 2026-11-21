'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { ResultHero } from './ResultHero'
import { useFilings } from '../hooks/useBorderTax'
import { BT_STATES, lateUnseen, markLateSeen, fmtWhen } from '../lib/borderTax'

/** Feed popup: a border-tax payment was found after the QR timed out → it's PAID, get the receipt. */
export function LatePaidPopup() {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const router = useRouter()
  const filings = useFilings()
  const [closed, setClosed] = useState(null)
  const f = lateUnseen(filings.data)
  if (!f || closed === f.id) return null
  const done = () => { markLateSeen(f.id); setClosed(f.id) }
  const from = fmtWhen(f.taxFrom)
  const upto = fmtWhen(f.taxUpto)
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={done} label={t('bt.late.title')}>
      <ResultHero kind="paid" title={t('bt.late.title')} message={t('bt.late.sub', { vehicle: f.vehicleNo, state: BT_STATES[f.stateCd]?.name || f.stateCd })} />
      <p className="mb-4 rounded-xl bg-ec-bg px-3 py-2.5 text-center text-[13px] font-bold text-ec-blueInk">
        {t('bt.prep.validity', { from: `${from.date}, ${from.time}`, to: `${upto.date}, ${upto.time}` })}
      </p>
      <div className="flex flex-col gap-3 pb-2">
        <Button type="button" size="lg" className="w-full" onClick={() => { done(); router.push(`/seva/border-tax?open=${f.id}`) }}>{t('bt.late.cta')}</Button>
        <Button type="button" variant="ghost" className="w-full bg-white font-bold text-ec-danger hover:bg-ec-dangerBg" onClick={done}>{tc('actions.close')}</Button>
      </div>
    </BottomSheet>
  )
}

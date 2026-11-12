'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Spinner, Check, CircleX, Ban, Info } from '@/components/ui/icons'
import { BT_STATES, BT_TONE, fmtWhen, rupees } from '../lib/borderTax'

const PILL = {
  progress: ['bg-ec-sky text-ec-blueInk', Spinner],
  action: ['bg-ec-warnBg text-ec-amberTx', Info],
  done: ['bg-ec-successBg text-ec-successTx', Check],
  bad: ['bg-ec-dangerBg text-ec-danger', CircleX],
  muted: ['bg-ec-bg text-ec-ink60', Ban],
}

function StatusPill({ status, failureCode }) {
  const t = useTranslations('seva')
  const [cls, Icon] = PILL[BT_TONE[status]] || PILL.progress
  return (
    <div className={`mt-3 flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${cls}`}>
      <span className="mt-0.5"><Icon size={18} /></span>
      <div>
        <p className="text-[14px] font-extrabold">{t(`bt.status.${status}.t`)}</p>
        <p className="text-[12.5px] font-medium opacity-80">{BT_TONE[status] === 'bad' ? t(`bt.fail.${failureCode || 'portal_error'}`) : t(`bt.status.${status}.s`)}</p>
      </div>
    </div>
  )
}

/** History cards (CabsWale): RC • state, ₹, date, status pill, View status. */
export function FilingHistory({ filings, isLoading, onOpen, hasMore, loadingMore, onMore }) {
  const t = useTranslations('seva')
  return (
    <section className="mt-5">
      <h2 className="mb-2.5 text-[16px] font-extrabold tracking-tight text-ec-ink">{t('bt.history')}</h2>
      {isLoading && <div className="h-28 animate-pulse rounded-ec-card bg-white" />}
      {!isLoading && filings.length === 0 && (
        <p className="rounded-ec-card border border-dashed border-ec-line bg-white px-4 py-6 text-center text-[13px] font-medium text-ec-ink60">{t('bt.historyEmpty')}</p>
      )}
      <div className="space-y-3">
        {filings.map((f) => (
          <article key={f.id} className="rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-[15px] font-extrabold text-ec-ink">{f.vehicleNo} • {BT_STATES[f.stateCd]?.name || f.stateCd}</p>
              {f.taxPaise !== null && <p className="shrink-0 text-[15px] font-extrabold text-ec-ink">{rupees(f.taxPaise)}</p>}
            </div>
            <p className="text-[12.5px] font-medium text-ec-ink60">{fmtWhen(f.taxFrom).date}</p>
            <StatusPill status={f.status} failureCode={f.failureCode} />
            <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => onOpen(f.id)}>{t('bt.viewStatus')}</Button>
          </article>
        ))}
      </div>
      {hasMore && (
        <Button type="button" variant="ghost" className="mt-3 w-full" disabled={loadingMore} onClick={onMore}>
          {loadingMore ? <Spinner size={18} /> : t('bt.historyMore')}
        </Button>
      )}
    </section>
  )
}

'use client'

import { Landmark, FileDown } from 'lucide-react'
import { useFilings } from '@/features/borderTax/hooks/useBorderTax'
import { fetchReceiptUrl } from '@/features/borderTax/services/borderTaxApi'
import { StateSwitches } from '@/features/borderTax/components/StateSwitches'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { ListFilters } from '@/features/shell/components/ListFilters'
import { button, pill } from '@/lib/ui'

const opts = (pairs) => pairs.map(([id, label]) => ({ id, label }))
const STATES = opts([['', 'All'], ['HR', 'Haryana'], ['HP', 'Himachal'], ['UP', 'Uttar Pradesh'], ['RJ', 'Rajasthan'], ['UK', 'Uttarakhand']])
const STATUS = {
  queued: ['Queued', 'amber'], filling: ['Filling', 'amber'], awaiting_captcha: ['Captcha', 'amber'],
  awaiting_payment: ['QR shown', 'violet'], handed_off: ['Handed off', 'blue'], paid: ['Paid', 'green'],
  failed: ['Failed', 'red'], expired: ['Expired', 'red'], cancelled: ['Cancelled', 'slate'],
}
const STATUSES = opts([['', 'All'], ...Object.entries(STATUS).map(([id, [label]]) => [id, label])])
const RANGES = opts([['', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']])
const WHO = opts([['real', 'Real drivers'], ['test', 'Test accounts'], ['all', 'Everyone']])
const UNLOCK = { queued: 'Lock clear queued', waiting: 'Lock clear waiting', cleared: 'Lock cleared', paid: 'Lock: was paid', failed: 'Lock clear failed' }

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
const inr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

/** Totals over the whole filter: all, paid (+ amount), then each other status present. */
function Totals({ byStatus }) {
  const all = byStatus.reduce((n, s) => n + s.count, 0)
  const paid = byStatus.find((s) => s.status === 'paid')
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-sm">
      <span className={pill()}>{all} filings</span>
      {paid && <span className={pill({ tone: 'green' })}>{paid.count} paid · {inr(paid.paise)}</span>}
      {byStatus.filter((s) => s.status !== 'paid').map((s) => (
        <span key={s.status} className={pill({ tone: STATUS[s.status]?.[1] })}>{s.count} {STATUS[s.status]?.[0] || s.status}</span>
      ))}
    </div>
  )
}

async function openReceipt(id) {
  const tab = window.open('', '_blank') // opened on the tap so pop-up blockers allow it
  try { tab.location = await fetchReceiptUrl(id) } catch { tab?.close() }
}

function Row({ f }) {
  const [label, tone] = STATUS[f.status] || [f.status, 'slate']
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-ec-ink">
          {f.vehicleNo} · {f.stateCd} {f.checkpost || ''} · {f.seats}{f.taxPaise ? ` · ${inr(f.taxPaise)}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-ec-ink60">
          {when(f.createdAt)} · {f.userName || 'Driver'}{f.isTest ? ' (test)' : ''}{f.receiptNo ? ` · ${f.receiptNo}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={pill({ tone })}>{label}</span>
        {f.failureCode && <span className={pill({ tone: 'red' })}>{f.failureCode}</span>}
        {f.unlock && <span className={pill({ tone: f.unlock.status === 'failed' ? 'red' : 'slate' })}>{UNLOCK[f.unlock.status] || f.unlock.status}</span>}
        {f.hasReceipt && (
          <button type="button" onClick={() => openReceipt(f.id)} className={button({ size: 'sm' })}><FileDown size={14} /> Receipt</button>
        )}
      </div>
    </li>
  )
}

export default function BorderTaxPage() {
  const f = useFilings()
  return (
    <div>
      <PageHeader icon={Landmark} title="Border tax" description="Every filing drivers made in the app, newest first. Refreshes every 30 seconds." />
      <StateSwitches />
      <ListFilters
        q={f.q}
        onSearch={f.setFilter('q')}
        placeholder="Search vehicle number"
        rows={[
          { label: 'State', options: STATES, value: f.state, onChange: f.setFilter('state') },
          { label: 'Status', options: STATUSES, value: f.status, onChange: f.setFilter('status') },
          { label: 'Date', options: RANGES, value: f.range, onChange: f.setFilter('range') },
          { label: 'Who', options: WHO, value: f.who, onChange: f.setFilter('who') },
        ]}
      />
      <Totals byStatus={f.byStatus} />
      <QueryState
        isLoading={f.isLoading}
        isError={f.isError}
        isEmpty={f.items.length === 0}
        emptyMessage="No filings match these filters."
        errorMessage="Failed to load filings."
      >
        <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
          {f.items.map((x) => <Row key={x.id} f={x} />)}
        </ul>
      </QueryState>
      <Pagination page={f.page} total={f.total} limit={f.limit} onChange={f.setPage} />
    </div>
  )
}

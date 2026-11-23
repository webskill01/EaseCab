'use client'

import { useEffect } from 'react'
import { Landmark, FileDown, Eye, X } from 'lucide-react'
import { UserLink } from '@/features/shell/components/UserLink'
import { useFilings } from '@/features/borderTax/hooks/useBorderTax'
import { fetchReceiptUrl } from '@/features/borderTax/services/borderTaxApi'
import { StateSwitches } from '@/features/borderTax/components/StateSwitches'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { ListFilters } from '@/features/shell/components/ListFilters'
import { button, pill } from '@/lib/ui'
import { OUTCOME, issueLabel, issueList } from '@/features/borderTax/lib/tags'

const opts = (pairs) => pairs.map(([id, label]) => ({ id, label }))
const STATES = opts([['', 'All'], ['HR', 'Haryana'], ['HP', 'Himachal'], ['UP', 'Uttar Pradesh'], ['RJ', 'Rajasthan'], ['UK', 'Uttarakhand'], ['PB', 'Punjab']])
const STATUS = {
  queued: ['Queued', 'amber'], filling: ['Filling', 'amber'], awaiting_captcha: ['Captcha', 'amber'],
  awaiting_payment: ['QR shown', 'violet'], handed_off: ['Handed off', 'blue'], paid: ['Paid', 'green'],
  failed: ['Failed', 'red'], expired: ['Expired', 'red'], cancelled: ['Cancelled', 'slate'],
}
const STATUSES = opts([['', 'All'], ...Object.entries(STATUS).map(([id, [label]]) => [id, label])])
const OUTCOMES = opts([['', 'All'], ...Object.entries(OUTCOME).map(([id, [label]]) => [id, label])])
const RANGES = opts([['', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']])
const WHO = opts([['real', 'Real drivers'], ['test', 'Test accounts'], ['all', 'Everyone']])
const UNLOCK = { queued: 'Lock clear queued', waiting: 'Lock clear waiting', cleared: 'Lock cleared', paid: 'Lock: was paid', failed: 'Lock clear failed' }

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
const inr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

/** Totals over the whole filter, one per result tag; failure codes listed under each. */
function Totals({ byStatus }) {
  const all = byStatus.reduce((n, s) => n + s.count, 0)
  const paid = byStatus.find((s) => s.outcome === 'paid')
  return (
    <div className="mb-4 space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <span className={pill()}>{all} filings</span>
        {paid && <span className={pill({ tone: 'green' })}>{paid.count} paid · {inr(paid.paise)}</span>}
        {byStatus.filter((s) => s.outcome !== 'paid').map((s) => (
          <span key={s.outcome} className={pill({ tone: OUTCOME[s.outcome]?.[1] })}>{s.count} {OUTCOME[s.outcome]?.[0] || s.outcome}</span>
        ))}
      </div>
      {byStatus.filter((s) => Object.keys(s.codes || {}).length).map((s) => (
        <p key={s.outcome} className="text-xs text-ec-ink60"><b>{OUTCOME[s.outcome]?.[0] || s.outcome}:</b> {issueList(s.codes)}</p>
      ))}
    </div>
  )
}

async function openReceipt(id, view) {
  const tab = window.open('', '_blank') // opened on the tap so pop-up blockers allow it
  try { tab.location = await fetchReceiptUrl(id, view) } catch { tab?.close() }
}

function Row({ f }) {
  const [label, tone] = OUTCOME[f.outcome] || STATUS[f.status] || [f.status, 'slate']
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-ec-ink">
          {f.vehicleNo} · {f.stateCd} {f.checkpost || ''} · {f.seats}{f.taxPaise ? ` · ${inr(f.taxPaise)}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-ec-ink60">
          {when(f.createdAt)} · <UserLink id={f.userId}>{f.userName || 'Driver'}</UserLink>{f.isTest ? ' (test)' : ''}{f.receiptNo ? ` · ${f.receiptNo}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={pill({ tone })}>{label}</span>
        {f.failureCode && <span title={f.failureCode} className={pill({ tone: f.outcome === 'failed' ? 'red' : 'slate' })}>{issueLabel(f.failureCode)}</span>}
        {f.unlock && <span className={pill({ tone: f.unlock.status === 'failed' ? 'red' : 'slate' })}>{UNLOCK[f.unlock.status] || f.unlock.status}</span>}
        {f.hasReceipt && (
          <>
            <button type="button" onClick={() => openReceipt(f.id, true)} className={button({ size: 'sm', variant: 'primary' })}><Eye size={14} /> View</button>
            <button type="button" onClick={() => openReceipt(f.id)} className={button({ size: 'sm' })}><FileDown size={14} /> Receipt</button>
          </>
        )}
      </div>
    </li>
  )
}

export default function BorderTaxPage() {
  const f = useFilings()
  const pickUser = f.setFilter('userId')
  // ?user=<id> from a user page → that driver's filings only
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('user')
    if (id) pickUser(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <PageHeader icon={Landmark} title="Border tax" description="Every filing drivers made in the app, newest first. Refreshes every 30 seconds." />
      <StateSwitches />
      <ListFilters
        q={f.q}
        onSearch={f.setFilter('q')}
        placeholder="Vehicle no., driver name or phone"
        rows={[
          { label: 'State', options: STATES, value: f.state, onChange: f.setFilter('state') },
          { label: 'Result', options: OUTCOMES, value: f.outcome, onChange: f.setFilter('outcome') },
          { label: 'Status', options: STATUSES, value: f.status, onChange: f.setFilter('status') },
          { label: 'Date', options: RANGES, value: f.range, onChange: f.setFilter('range') },
          { label: 'Who', options: WHO, value: f.who, onChange: f.setFilter('who') },
        ]}
      />
      {f.userId && (
        <button type="button" onClick={() => { pickUser(''); window.history.replaceState(null, '', window.location.pathname) }} className={`${pill({ tone: 'blue' })} mb-3 gap-1`}>
          One driver{f.items[0]?.userName ? `: ${f.items[0].userName}` : ''} <X size={12} />
        </button>
      )}
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

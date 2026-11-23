'use client'

import { Landmark } from 'lucide-react'
import { useFilings } from '@/features/borderTax/hooks/useBorderTax'
import { FilingRow, STATUS, inr } from '@/features/borderTax/components/FilingRow'
import { StateSwitches } from '@/features/borderTax/components/StateSwitches'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { ListFilters } from '@/features/shell/components/ListFilters'
import { pill } from '@/lib/ui'
import { OUTCOME, issueList } from '@/features/borderTax/lib/tags'

const opts = (pairs) => pairs.map(([id, label]) => ({ id, label }))
const STATES = opts([['', 'All'], ['HR', 'Haryana'], ['HP', 'Himachal'], ['UP', 'Uttar Pradesh'], ['RJ', 'Rajasthan'], ['UK', 'Uttarakhand'], ['PB', 'Punjab']])
const STATUSES = opts([['', 'All'], ...Object.entries(STATUS).map(([id, [label]]) => [id, label])])
const OUTCOMES = opts([['', 'All'], ...Object.entries(OUTCOME).map(([id, [label]]) => [id, label])])
const RANGES = opts([['', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']])

/** Totals over the whole filter, one pill per result tag. */
function Totals({ byStatus }) {
  const all = byStatus.reduce((n, s) => n + s.count, 0)
  const paid = byStatus.find((s) => s.outcome === 'paid')
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-sm">
      <span className={pill()}>{all} filings</span>
      {paid && <span className={pill({ tone: 'green' })}>{paid.count} paid · {inr(paid.paise)}</span>}
      {byStatus.filter((s) => s.outcome !== 'paid').map((s) => (
        <span key={s.outcome} className={pill({ tone: OUTCOME[s.outcome]?.[1] })}>{s.count} {OUTCOME[s.outcome]?.[0] || s.outcome}</span>
      ))}
    </div>
  )
}

/** Why filings ended, per result tag — collapsed under the list so the filings stay on top. */
function Breakdown({ byStatus }) {
  const rows = byStatus.filter((s) => Object.keys(s.codes || {}).length)
  if (!rows.length) return null
  return (
    <details className="mt-4 rounded-ec-card border border-ec-line bg-white px-4 py-3 text-sm">
      <summary className="cursor-pointer font-semibold text-ec-ink">Issue breakdown</summary>
      {rows.map((s) => (
        <p key={s.outcome} className="mt-2 text-xs text-ec-ink60"><b>{OUTCOME[s.outcome]?.[0] || s.outcome}:</b> {issueList(s.codes)}</p>
      ))}
    </details>
  )
}

export default function BorderTaxPage() {
  const f = useFilings()
  return (
    <div>
      <PageHeader icon={Landmark} title="Border tax" description="Every filing real drivers made in the app (test accounts hidden), newest first. Refreshes every 30 seconds." />
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
          {f.items.map((x) => <FilingRow key={x.id} f={x} />)}
        </ul>
      </QueryState>
      <Pagination page={f.page} total={f.total} limit={f.limit} onChange={f.setPage} />
      <Breakdown byStatus={f.byStatus} />
    </div>
  )
}

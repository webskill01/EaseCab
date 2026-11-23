'use client'

import { useState } from 'react'
import { useUserFilings } from '../hooks/useBorderTax'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { pill } from '@/lib/ui'
import { OUTCOME } from '../lib/tags'
import { FilingRow, inr } from './FilingRow'

/** User page: totals per result tag + every filing of this driver (date, paid or not, issue, receipt). */
export function UserFilings({ userId, groups }) {
  const [page, setPage] = useState(1)
  const q = useUserFilings(userId, page)
  const total = groups.reduce((n, g) => n + g.count, 0)
  if (!total) return <p className="text-sm text-ec-ink60">No filings yet.</p>
  return (
    <>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className={pill()}>{total} filed</span>
        {groups.map((g) => (
          <span key={g.outcome} className={pill({ tone: OUTCOME[g.outcome]?.[1] ?? 'slate' })}>
            {g.count} {OUTCOME[g.outcome]?.[0] ?? g.outcome}{g.outcome === 'paid' && g.paise ? ` · ${inr(g.paise)}` : ''}
          </span>
        ))}
      </div>
      <QueryState isLoading={q.isLoading} isError={q.isError} isEmpty={q.items.length === 0} emptyMessage="No filings." errorMessage="Failed to load filings.">
        <ul className="-mx-4 mt-3 divide-y divide-ec-line border-t border-ec-line sm:mx-0 sm:rounded-ec-card sm:border">
          {q.items.map((x) => <FilingRow key={x.id} f={x} showDriver={false} />)}
        </ul>
      </QueryState>
      <Pagination page={page} total={q.total} limit={q.limit} onChange={setPage} />
    </>
  )
}

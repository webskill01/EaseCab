'use client'

import { Flag } from 'lucide-react'
import { useReports } from '@/features/reports/hooks/useReports'
import { ReportCard } from '@/features/reports/components/ReportCard'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { Segmented } from '@/features/shell/components/Segmented'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'

const STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
]

export default function ReportsPage() {
  const { items, total, limit, page, setPage, status, setStatus, isLoading, isError, review } = useReports()

  return (
    <div>
      <PageHeader
        icon={Flag}
        title="Reports"
        count={total}
        tone="from-rose-500 to-red-600"
        description="Rides drivers flagged. Dismiss false alarms or take the ride down."
        actions={<Segmented options={STATUSES} value={status} onChange={setStatus} />}
      />

      <QueryState isLoading={isLoading} isError={isError} isEmpty={items.length === 0} errorMessage="Failed to load the queue." emptyMessage="No reports." emptyHint="Nothing flagged right now.">
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <ReportCard key={item.id} item={item} onAction={(id, action) => review.mutate({ id, action })} />
          ))}
        </div>
      </QueryState>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  )
}

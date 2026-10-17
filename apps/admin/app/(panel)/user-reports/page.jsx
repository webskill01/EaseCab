'use client'

import { UserX } from 'lucide-react'
import { useUserReports } from '@/features/user-reports/hooks/useUserReports'
import { UserReportCard } from '@/features/user-reports/components/UserReportCard'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'

export default function UserReportsPage() {
  const { items, total, limit, page, setPage, isLoading, isError, review } = useUserReports()

  return (
    <div>
      <PageHeader
        icon={UserX}
        title="User Reports"
        count={total}
        tone="from-orange-500 to-red-500"
        description="Drivers reported by others. Reinstate if the auto-hide was wrong, or keep them hidden."
      />

      <QueryState isLoading={isLoading} isError={isError} isEmpty={items.length === 0} errorMessage="Failed to load the queue." emptyMessage="No reported users.">
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <UserReportCard key={item.user.id} item={item} onAction={(userId, action) => review.mutate({ userId, action })} />
          ))}
        </div>
      </QueryState>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  )
}

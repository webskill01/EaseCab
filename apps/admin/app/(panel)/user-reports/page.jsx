'use client'

import { useUserReports } from '@/features/user-reports/hooks/useUserReports'
import { UserReportCard } from '@/features/user-reports/components/UserReportCard'

export default function UserReportsPage() {
  const { items, total, isLoading, isError, review } = useUserReports()

  return (
    <div>
      <h1 className="text-xl font-semibold text-ec-ink">
        User Reports <span className="text-sm font-normal text-ec-ink60">({total})</span>
      </h1>

      {isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load the queue.</p>}
      {!isLoading && !isError && items.length === 0 && <p className="mt-4 text-sm text-ec-ink60">No reported users.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <UserReportCard key={item.user.id} item={item} onAction={(userId, action) => review.mutate({ userId, action })} />
        ))}
      </div>
    </div>
  )
}

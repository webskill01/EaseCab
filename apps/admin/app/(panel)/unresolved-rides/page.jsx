'use client'

import { Route } from 'lucide-react'
import { useUnresolvedRides } from '@/features/unresolved-rides/hooks/useUnresolvedRides'
import { UnresolvedRideRow } from '@/features/unresolved-rides/components/UnresolvedRideRow'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'

export default function UnresolvedRidesPage() {
  const { items, total, limit, page, setPage, isLoading, isError, action } = useUnresolvedRides()

  return (
    <div>
      <PageHeader
        icon={Route}
        title="Unresolved Rides"
        count={total}
        tone="from-teal-500 to-emerald-600"
        description="Live bot rides missing a pickup or drop city. Set the right city, or hide the ride."
      />

      <QueryState isLoading={isLoading} isError={isError} isEmpty={items.length === 0} errorMessage="Failed to load the queue." emptyMessage="Queue is clear.">
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((row) => (
            <UnresolvedRideRow
              key={row.id}
              row={row}
              onAction={(id, act, side, cityId) => action.mutate({ id, action: act, side, cityId })}
            />
          ))}
        </div>
      </QueryState>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  )
}

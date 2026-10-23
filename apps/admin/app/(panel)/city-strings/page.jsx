'use client'

import { MapPin } from 'lucide-react'
import { useCityStrings } from '@/features/city-strings/hooks/useCityStrings'
import { CityStringRow } from '@/features/city-strings/components/CityStringRow'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'

export default function CityStringsPage() {
  const { items, total, limit, page, setPage, isLoading, isError, action } = useCityStrings()

  return (
    <div>
      <PageHeader
        icon={MapPin}
        title="City Strings"
        count={total}
        description="Unresolved city names from the bot feed. Resolve each to a city or dismiss junk."
      />

      <QueryState isLoading={isLoading} isError={isError} isEmpty={items.length === 0} errorMessage="Failed to load the queue." emptyMessage="Queue is clear.">
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((row) => (
            <CityStringRow key={row.id} row={row} onAction={(id, act, cityId) => action.mutate({ id, action: act, cityId })} />
          ))}
        </div>
      </QueryState>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  )
}

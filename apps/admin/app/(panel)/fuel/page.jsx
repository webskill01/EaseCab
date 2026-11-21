'use client'

import { Fuel } from 'lucide-react'
import { useFuelQueue } from '@/features/fuel/hooks/useFuelQueue'
import { FuelStationCard } from '@/features/fuel/components/FuelStationCard'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { Segmented } from '@/features/shell/components/Segmented'

export default function FuelPage() {
  const q = useFuelQueue()
  const tabs = [
    { id: 'pending', label: `New pumps (${q.counts.pending})` },
    { id: 'reports', label: `Driver reports (${q.counts.reports})` },
  ]
  return (
    <div>
      <PageHeader
        icon={Fuel}
        title="Fuel Pumps"
        count={q.total}
        description="Pumps drivers added (approve to show them in the app) and pumps drivers reported (CNG yes / no / closed). Any action clears the pump's open reports; Dismiss clears them without changing the pump."
      />
      <Segmented options={tabs} value={q.tab} onChange={q.setTab} />
      <div className="mt-4">
        <QueryState isLoading={q.isLoading} isError={q.isError} isEmpty={q.items.length === 0} errorMessage="Failed to load pumps." emptyMessage="Nothing to review.">
          <div className="grid gap-3 lg:grid-cols-2">
            {q.items.map((s) => <FuelStationCard key={s.id} station={s} onDecide={(id, patch) => q.decide.mutate({ id, patch })} />)}
          </div>
        </QueryState>
      </div>
      <Pagination page={q.page} total={q.total} limit={q.limit} onChange={q.setPage} />
    </div>
  )
}

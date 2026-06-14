'use client'

import { useCityStrings } from '@/features/city-strings/hooks/useCityStrings'
import { CityStringRow } from '@/features/city-strings/components/CityStringRow'

export default function CityStringsPage() {
  const { items, total, page, setPage, isLoading, isError, action } = useCityStrings()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ec-ink">
          City Strings <span className="text-sm font-normal text-ec-ink60">({total})</span>
        </h1>
      </div>
      <p className="mt-1 text-sm text-ec-ink60">Unresolved city names from the bot feed. Resolve each to a city or dismiss junk.</p>

      {isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load the queue.</p>}
      {!isLoading && !isError && items.length === 0 && <p className="mt-4 text-sm text-ec-ink60">Queue is clear.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((row) => (
          <CityStringRow key={row.id} row={row} onAction={(id, act, cityId) => action.mutate({ id, action: act, cityId })} />
        ))}
      </div>

      {(page > 1 || items.length > 0) && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border px-3 py-1.5 text-ec-ink disabled:opacity-40">Prev</button>
          <span className="text-ec-ink60">Page {page}</span>
          <button type="button" onClick={() => setPage(page + 1)} className="rounded-md border px-3 py-1.5 text-ec-ink">Next</button>
        </div>
      )}
    </div>
  )
}

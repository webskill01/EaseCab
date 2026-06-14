'use client'

import { useReports } from '@/features/reports/hooks/useReports'
import { ReportCard } from '@/features/reports/components/ReportCard'

export default function ReportsPage() {
  const { items, total, status, setStatus, isLoading, isError, review } = useReports()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ec-ink">
          Reports <span className="text-sm font-normal text-ec-ink60">({total})</span>
        </h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border px-2 py-1 text-sm text-ec-ink"
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load the queue.</p>}
      {!isLoading && !isError && items.length === 0 && <p className="mt-4 text-sm text-ec-ink60">No reports.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <ReportCard key={item.id} item={item} onAction={(id, action) => review.mutate({ id, action })} />
        ))}
      </div>
    </div>
  )
}

import { Inbox, AlertTriangle } from 'lucide-react'
import { card } from '@/lib/ui'

/** Shimmering placeholder cards while a list loads. */
export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${card} animate-pulse`}>
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ message = 'Failed to load.' }) {
  return (
    <div className="flex items-center gap-3 rounded-ec-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertTriangle size={18} /> {message}
    </div>
  )
}

export function EmptyState({ message = 'Nothing here.', hint }) {
  return (
    <div className="flex flex-col items-center rounded-ec-card border border-dashed border-ec-line bg-white px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ec-sky text-ec-blue"><Inbox size={22} /></span>
      <p className="mt-3 text-sm font-semibold text-ec-ink">{message}</p>
      {hint && <p className="mt-1 text-xs text-ec-ink60">{hint}</p>}
    </div>
  )
}

/** Loading / error / empty switch for a list; renders children once there are items. */
export function QueryState({ isLoading, isError, isEmpty, errorMessage, emptyMessage, emptyHint, children }) {
  if (isLoading) return <ListSkeleton />
  if (isError) return <ErrorState message={errorMessage} />
  if (isEmpty) return <EmptyState message={emptyMessage} hint={emptyHint} />
  return children
}

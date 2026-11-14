/**
 * Skeleton placeholders. The container carries `.ec-shimmer` (globals.css) so one light
 * band sweeps left → right across all its bars at once.
 */

/** A grey placeholder bar — size/shape via className. */
export function Bar({ className = '' }) {
  return <div className={`rounded-md bg-ec-line ${className}`} />
}

/** White card that shimmers; put Bars inside. */
export function SkeletonCard({ className = '', children }) {
  return (
    <div aria-hidden="true" className={`ec-shimmer rounded-ec-card border border-ec-line bg-white p-3.5 shadow-ec-card ${className}`}>
      {children}
    </div>
  )
}

/** One list row: icon dot + two lines + a trailing pill. */
function Row() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Bar className="h-9 w-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2"><Bar className="h-3 w-2/3" /><Bar className="h-2.5 w-5/12" /></div>
      <Bar className="h-6 w-11 shrink-0 rounded-full" />
    </div>
  )
}

/** Settings/list loading: a shimmering card of `rows` rows. */
export function ListSkeleton({ rows = 4, className = '' }) {
  return (
    <SkeletonCard className={`divide-y divide-ec-line py-1 ${className}`}>
      {Array.from({ length: rows }, (_, i) => <Row key={i} />)}
    </SkeletonCard>
  )
}

/** Full-screen loading (profile, membership, verification, …): hero card + list card. */
export function ScreenSkeleton({ rows = 3 }) {
  return (
    <div role="status" aria-busy="true" className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-ec-bg p-4">
      <SkeletonCard className="flex items-center gap-3.5">
        <Bar className="h-16 w-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2.5"><Bar className="h-4 w-1/2" /><Bar className="h-3 w-3/4" /><Bar className="h-3 w-1/3" /></div>
      </SkeletonCard>
      <SkeletonCard className="space-y-3">
        <Bar className="h-3.5 w-1/3" />
        <div className="grid grid-cols-3 gap-2.5"><Bar className="h-14" /><Bar className="h-14" /><Bar className="h-14" /></div>
      </SkeletonCard>
      <ListSkeleton rows={rows} />
    </div>
  )
}

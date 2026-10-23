import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const has = (v) => v !== null && v !== undefined

/**
 * This-week value vs last week. `unit: 'pct'` shows the change in points, anything
 * else as a % change. `target` (percent) adds an on/below-target pill.
 */
export function MetricCard({ label, value, prev, fmt, unit, target, hint }) {
  let delta = null
  if (has(value) && has(prev)) {
    if (unit === 'pct') delta = Math.round((value - prev) * 10) / 10
    else if (prev > 0) delta = Math.round(((value - prev) / prev) * 100)
  }
  const Arrow = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus
  const onTarget = has(target) && has(value) ? value >= target : null

  return (
    <div className="h-full rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-ec-ink60">{label}</span>
        {onTarget !== null && (
          <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', onTarget ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800')}>
            {onTarget ? 'On target' : `Target ${target}%`}
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ec-ink">{has(value) ? fmt(value) : '—'}</div>
      <div className="mt-1 text-xs">
        {delta === null ? (
          <span className="text-ec-ink40">no previous week yet</span>
        ) : (
          <span className={cn('inline-flex items-center gap-0.5 font-semibold', delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-ec-ink40')}>
            <Arrow size={14} />
            {delta > 0 ? '+' : ''}{delta}{unit === 'pct' ? ' pts' : '%'}
            <span className="ml-1 font-normal text-ec-ink40">vs last week</span>
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-ec-ink40">{hint}</div>}
    </div>
  )
}

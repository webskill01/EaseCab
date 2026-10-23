import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tone → soft icon tile (finance-panel badge colours).
const TONES = {
  blue: 'bg-ec-sky text-ec-blueDeep',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  violet: 'bg-violet-50 text-violet-700',
  green: 'bg-emerald-50 text-emerald-700',
  sky: 'bg-ec-sky text-ec-blueDeep',
}

/** Metric tile with a coloured icon; becomes a link (with hover lift) when `href` is set. */
export function StatCard({ label, value, icon: Icon, tone = 'blue', href, hint }) {
  const body = (
    <div className={cn('relative h-full overflow-hidden rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card', href && 'transition hover:border-ec-blue/40')}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-ec-ink60">{label}</span>
        {Icon && <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONES[tone])}><Icon size={16} /></span>}
      </div>
      <div className="mt-1 flex items-center gap-1 text-2xl font-semibold tabular-nums text-ec-ink">
        {value}
        {href && <ArrowUpRight size={14} className="text-ec-ink40 transition group-hover:text-ec-blue" />}
      </div>
      {hint && <div className="mt-0.5 text-xs text-ec-ink40">{hint}</div>}
    </div>
  )
  return href ? <Link href={href} className="group block">{body}</Link> : body
}

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tone → icon tile gradient + soft background glow.
const TONES = {
  blue: 'from-blue-500 to-indigo-600 shadow-blue-500/30',
  amber: 'from-amber-400 to-orange-500 shadow-amber-500/30',
  red: 'from-rose-500 to-red-600 shadow-red-500/30',
  violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
  green: 'from-emerald-400 to-teal-600 shadow-emerald-500/30',
  sky: 'from-sky-400 to-cyan-600 shadow-sky-500/30',
}

/** Metric tile with a coloured icon; becomes a link (with hover lift) when `href` is set. */
export function StatCard({ label, value, icon: Icon, tone = 'blue', href, hint }) {
  const body = (
    <div className={cn('relative h-full overflow-hidden rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card sm:p-5', href && 'transition-all hover:-translate-y-0.5 hover:shadow-ec-float')}>
      <div className="flex items-start justify-between">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg', TONES[tone])}>
          {Icon && <Icon size={19} />}
        </span>
        {href && <ArrowUpRight size={16} className="text-ec-ink40 transition group-hover:text-ec-blue" />}
      </div>
      <div className="mt-4 text-2xl font-bold tabular-nums text-ec-ink sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-sm text-ec-ink60">{label}</div>
      {hint && <div className="mt-1 text-xs text-ec-ink40">{hint}</div>}
    </div>
  )
  return href ? <Link href={href} className="group block">{body}</Link> : body
}

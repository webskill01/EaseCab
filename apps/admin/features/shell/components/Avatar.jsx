import { initials } from '@/lib/ui'

// Stable colour per name so the same person keeps the same bubble.
const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600', 'bg-indigo-500']

/** Initials bubble (decorative — the name is always rendered next to it). */
export function Avatar({ name, size = 'h-10 w-10 text-sm' }) {
  const n = name ?? ''
  const color = COLORS[[...n].reduce((t, c) => t + c.charCodeAt(0), 0) % COLORS.length]
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${size} ${color}`}>
      {initials(name)}
    </span>
  )
}

import { cva } from 'class-variance-authority'

/** Button styles shared by every admin screen. */
export const button = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue/50',
  {
    variants: {
      variant: {
        primary: 'bg-ec-blue text-white shadow-sm hover:bg-ec-blueDeep',
        danger: 'bg-ec-danger text-white shadow-sm hover:bg-red-600',
        success: 'bg-ec-success text-white shadow-sm hover:bg-emerald-600',
        outline: 'border border-ec-line bg-white text-ec-ink hover:border-ec-blue/40 hover:bg-ec-sky',
        ghost: 'text-ec-ink60 hover:bg-ec-sky hover:text-ec-ink',
        dangerOutline: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
      },
      size: { sm: 'h-8 px-3 text-xs', md: 'h-9 px-3.5 text-sm' },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
)

/** Coloured status pill. */
export const pill = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    tone: {
      blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
      green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
      amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
      violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
      slate: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
    },
  },
  defaultVariants: { tone: 'slate' },
})

/** Base card surface. */
export const card = 'rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card transition-shadow hover:shadow-ec-float sm:p-5'

/** Text input surface. */
export const input = 'h-9 w-full rounded-lg border border-ec-line bg-white px-3 text-sm text-ec-ink placeholder:text-ec-ink40 transition focus:border-ec-blue focus:outline-none focus:ring-2 focus:ring-ec-blue/20'

/** Report reasons → label + pill tone (rides + users share the enum). */
export const REASONS = {
  fake: { label: 'Fake', tone: 'red' },
  spam: { label: 'Spam', tone: 'amber' },
  wrong_info: { label: 'Wrong info', tone: 'violet' },
  inappropriate: { label: 'Inappropriate', tone: 'red' },
  other: { label: 'Other', tone: 'slate' },
}

/** Initials for avatar bubbles ("Gurpreet Singh" → "GS"). */
export function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

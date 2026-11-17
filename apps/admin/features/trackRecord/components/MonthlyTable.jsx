'use client'

import { useMonthly } from '../hooks/useMonthly'
import { ListSkeleton, ErrorState } from '@/features/shell/components/QueryState'
import { cn } from '@/lib/utils'

const fmtDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const num = (n) => n.toLocaleString('en-IN')

const COLS = [
  { key: 'newPayers', label: 'New', tip: 'Paid for the first time this month' },
  { key: 'renewed', label: 'Renewed', tip: 'Had paid before and paid again this month' },
  { key: 'payers', label: 'Total paid', tip: 'New + renewed (each driver once)' },
  { key: 'revenue', label: 'Revenue', fmt: (n) => `₹${num(n)}` },
  { key: 'plansEnded', label: 'Plans ended', tip: 'Paid plans that ran out this month (so far)' },
  { key: 'churned', label: 'Left', tip: 'Plan ended, 3-day grace over, never paid again' },
  { key: 'pending', label: 'In grace', tip: 'Plan ended under 3 days ago, may still renew' },
  { key: 'churnRate', label: 'Churn', fmt: (n) => `${n}%` },
  { key: 'activeEnd', label: 'Active at end', tip: 'Drivers with a paid plan running at month end (or now)' },
]

/** Billing months (16th → 15th) with new vs renewed payers and churn. */
export function MonthlyTable() {
  const { data, isLoading, isError } = useMonthly()
  if (isLoading) return <ListSkeleton />
  if (isError) return <ErrorState message="Failed to load monthly numbers." />
  const months = data?.months ?? []

  return (
    <div className="mb-6 overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
      <div className="px-4 pt-4">
        <h2 className="font-semibold text-ec-ink">Month by month</h2>
        <p className="text-sm text-ec-ink60">Billing months run 16th → 15th IST · the current month is still running · churn = left ÷ plans that ended and are settled</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-ec-ink60">
              <th className="px-3 py-3 font-semibold">Month</th>
              {COLS.map((c) => <th key={c.key} title={c.tip} className="px-3 py-3 text-right font-semibold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.start} className="border-t border-ec-line text-ec-ink hover:bg-ec-sky/60">
                <td className="whitespace-nowrap px-3 py-3 font-medium">{fmtDay(m.start)} – {fmtDay(m.end)}</td>
                {COLS.map((c) => {
                  const v = m[c.key]
                  if (v === null || v === undefined) return <td key={c.key} className="px-3 py-3 text-right text-ec-ink40">—</td>
                  return <td key={c.key} className={cn('px-3 py-3 text-right tabular-nums', v === 0 && 'text-ec-ink40')}>{(c.fmt ?? num)(v)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

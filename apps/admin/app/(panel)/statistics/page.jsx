'use client'

import { useGrowth } from '@/features/statistics/hooks/useGrowth'

const inr = (n) => `₹${n.toLocaleString('en-IN')}`

const TOTALS = [
  { key: 'signups', label: 'Signups' },
  { key: 'paidAccounts', label: 'Paid accounts' },
  { key: 'payments', label: 'Payments' },
  { key: 'revenue', label: 'Revenue', fmt: inr },
  { key: 'activeMembers', label: 'Active members (now)' },
]

const COLS = [
  { key: 'signups', label: 'Signups' },
  { key: 'paidAccounts', label: 'Paid accounts' },
  { key: 'payments', label: 'Payments' },
  { key: 'revenue', label: 'Revenue', fmt: inr },
]

export default function StatisticsPage() {
  const { data, isLoading, isError } = useGrowth()

  return (
    <div>
      <h1 className="text-xl font-semibold text-ec-ink">Statistics</h1>
      <p className="mt-1 text-sm text-ec-ink60">
        Since launch{data ? ` (${data.since})` : ''}, IST days. Play reviewer excluded.
      </p>

      {isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load statistics.</p>}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TOTALS.map((t) => (
              <div key={t.key} className="rounded-lg border bg-card p-4">
                <div className="text-3xl font-bold text-ec-ink">{(t.fmt ?? String)(data.totals[t.key])}</div>
                <div className="mt-1 text-sm text-ec-ink60">{t.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-ec-ink60">
                  <th className="px-4 py-2 font-medium">Day</th>
                  {COLS.map((c) => <th key={c.key} className="px-4 py-2 text-right font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => (
                  <tr key={d.day} className="border-b last:border-0 text-ec-ink">
                    <td className="px-4 py-2">{d.day}</td>
                    {COLS.map((c) => <td key={c.key} className="px-4 py-2 text-right tabular-nums">{(c.fmt ?? String)(d[c.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

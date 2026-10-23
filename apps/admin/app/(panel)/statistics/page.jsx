'use client'

import { useState } from 'react'
import { BarChart3, UserPlus, Crown, Receipt, IndianRupee, Users } from 'lucide-react'
import { useGrowth } from '@/features/statistics/hooks/useGrowth'
import { BarChart } from '@/features/statistics/components/BarChart'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { Segmented } from '@/features/shell/components/Segmented'
import { ListSkeleton, ErrorState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { card } from '@/lib/ui'

const inr = (n) => `₹${n.toLocaleString('en-IN')}`
const DAYS_PER_PAGE = 14

const TOTALS = [
  { key: 'signups', label: 'Signups', icon: UserPlus, tone: 'sky' },
  { key: 'paidAccounts', label: 'Paid accounts', icon: Crown, tone: 'green' },
  { key: 'payments', label: 'Payments', icon: Receipt, tone: 'amber' },
  { key: 'revenue', label: 'Revenue', icon: IndianRupee, tone: 'violet', fmt: inr },
  { key: 'activeMembers', label: 'Active members', icon: Users, tone: 'blue', hint: 'right now, joined since launch' },
]

const METRICS = [
  { id: 'signups', label: 'Signups', color: 'bg-sky-500' },
  { id: 'paidAccounts', label: 'Paid', color: 'bg-emerald-500' },
  { id: 'revenue', label: 'Revenue', color: 'bg-violet-500', fmt: inr },
]

const COLS = [
  { key: 'signups', label: 'Signups' },
  { key: 'paidAccounts', label: 'Paid' },
  { key: 'payments', label: 'Payments' },
  { key: 'revenue', label: 'Revenue', fmt: inr },
]

export default function StatisticsPage() {
  const { data, isLoading, isError } = useGrowth()
  const [metric, setMetric] = useState('signups')
  const [page, setPage] = useState(1)
  const m = METRICS.find((x) => x.id === metric)
  const days = data?.days ?? []
  const chart = days.slice(0, 30).reverse().map((d) => ({ label: d.day, value: d[metric] }))
  const rows = days.slice((page - 1) * DAYS_PER_PAGE, page * DAYS_PER_PAGE)

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Statistics"
        description={`Since launch${data ? ` (${data.since})` : ''} · IST days · Play reviewer excluded · refreshes every minute`}
      />

      {isLoading && <ListSkeleton />}
      {isError && <ErrorState message="Failed to load statistics." />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
            {TOTALS.map((t) => (
              <StatCard key={t.key} label={t.label} icon={t.icon} tone={t.tone} hint={t.hint} value={(t.fmt ?? String)(data.totals[t.key])} />
            ))}
          </div>

          <div className={`${card} mt-6`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-ec-ink">Daily trend <span className="text-sm font-normal text-ec-ink60">(last 30 days)</span></h2>
              <Segmented options={METRICS} value={metric} onChange={setMetric} />
            </div>
            <BarChart data={chart} format={m.fmt ?? String} color={m.color} />
          </div>

          <div className="mt-6 overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-ec-ink60">
                    <th className="px-4 py-3 font-semibold">Day</th>
                    {COLS.map((c) => <th key={c.key} className="px-4 py-3 text-right font-semibold">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.day} className="border-t border-ec-line text-ec-ink transition-colors hover:bg-ec-sky/60">
                      <td className="px-4 py-3 font-medium">{d.day}</td>
                      {COLS.map((c) => (
                        <td key={c.key} className={`px-4 py-3 text-right tabular-nums ${d[c.key] === 0 ? 'text-ec-ink40' : ''}`}>
                          {(c.fmt ?? String)(d[c.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} total={days.length} limit={DAYS_PER_PAGE} onChange={setPage} />
        </>
      )}
    </div>
  )
}

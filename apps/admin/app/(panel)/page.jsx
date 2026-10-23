'use client'

import Link from 'next/link'
import { BadgeCheck, Flag, UserPlus, Crown, IndianRupee, Percent, LayoutDashboard, ArrowRight } from 'lucide-react'
import { useStats } from '@/features/dashboard/hooks/useStats'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { useGrowth } from '@/features/statistics/hooks/useGrowth'
import { BarChart } from '@/features/statistics/components/BarChart'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { ErrorState } from '@/features/shell/components/QueryState'
import { card } from '@/lib/ui'

/** Open queues (clickable). */
const QUEUES = [
  { key: 'pendingVerifications', label: 'Pending verifications', href: '/verifications', icon: BadgeCheck, tone: 'amber' },
  { key: 'openReports', label: 'Open reports', href: '/reports', icon: Flag, tone: 'red' },
]

const inr = (n) => `₹${n.toLocaleString('en-IN')}`
/** Paid ÷ signups as "31.6%"; a dash when there are no signups to divide by. */
const ratio = (paid, signups) => (signups > 0 ? `${Math.round((paid / signups) * 1000) / 10}%` : '—')

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useStats()
  const growth = useGrowth()
  const today = growth.data?.days[0]
  const totals = growth.data?.totals
  const last14 = (growth.data?.days ?? []).slice(0, 14).reverse().map((d) => ({ label: d.day, value: d.signups }))
  const wait = '…'

  return (
    <div>
      <PageHeader icon={LayoutDashboard} title="Dashboard" description={`${greeting()} — here's today so far.`} />

      {(isError || growth.isError) && <div className="mb-4"><ErrorState message="Failed to load stats." /></div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Signups today" value={today ? today.signups : wait} icon={UserPlus} tone="sky" />
        <StatCard label="Paid accounts today" value={today ? today.paidAccounts : wait} icon={Crown} tone="green" />
        <StatCard label="Revenue today" value={today ? inr(today.revenue) : wait} icon={IndianRupee} tone="violet" />
        <StatCard
          label="Signups → paid"
          value={totals ? ratio(totals.paidAccounts, totals.signups) : wait}
          icon={Percent}
          tone="amber"
          hint={totals && today ? `${totals.paidAccounts} of ${totals.signups} since launch · today ${ratio(today.paidAccounts, today.signups)}` : null}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ec-ink">Signups — last 14 days</h2>
            <Link href="/statistics" className="flex items-center gap-1 text-sm font-medium text-ec-blue hover:underline">
              Statistics <ArrowRight size={14} />
            </Link>
          </div>
          {last14.length > 0 ? <BarChart data={last14} /> : <div className="h-40 animate-pulse rounded-lg bg-slate-100" />}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {QUEUES.map(({ key, ...c }) => (
            <StatCard key={key} {...c} value={isLoading ? wait : (data?.[key] ?? 0)} />
          ))}
        </div>
      </div>
    </div>
  )
}

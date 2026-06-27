'use client'

import Link from 'next/link'
import { useStats } from '@/features/dashboard/hooks/useStats'

/** Dashboard stat cards: the three open queues (clickable) + today's ingested rides. */
const CARDS = [
  { key: 'pendingVerifications', label: 'Pending verifications', href: '/verifications' },
  { key: 'openReports', label: 'Open reports', href: '/reports' },
  { key: 'unresolvedCities', label: 'Unresolved cities', href: '/city-strings' },
  { key: 'ridesToday', label: 'Rides today', href: null },
]

function StatCard({ label, value, href }) {
  const inner = (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-3xl font-bold text-ec-ink">{value}</div>
      <div className="mt-1 text-sm text-ec-ink60">{label}</div>
    </div>
  )
  return href ? <Link href={href} className="block transition-colors hover:border-ec-blue">{inner}</Link> : inner
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useStats()

  return (
    <div>
      <h1 className="text-xl font-semibold text-ec-ink">Dashboard</h1>

      {isError && <p className="mt-2 text-sm text-red-600">Failed to load stats.</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CARDS.map((c) => (
          <StatCard key={c.key} label={c.label} href={c.href} value={isLoading ? '…' : (data?.[c.key] ?? 0)} />
        ))}
      </div>
    </div>
  )
}

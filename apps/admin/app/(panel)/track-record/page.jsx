'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useTrackRecord } from '@/features/trackRecord/hooks/useTrackRecord'
import { MetricCard } from '@/features/trackRecord/components/MetricCard'
import { BarChart } from '@/features/statistics/components/BarChart'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { Segmented } from '@/features/shell/components/Segmented'
import { ListSkeleton, ErrorState } from '@/features/shell/components/QueryState'
import { card } from '@/lib/ui'
import { cn } from '@/lib/utils'

const inr = (n) => `₹${n.toLocaleString('en-IN')}`
const pct = (n) => `${n}%`
const num = (n) => n.toLocaleString('en-IN')

// One definition per metric drives the cards, the chart picker, the table and the
// plain-language glossary (`hint` = one-liner on the card, `explain`/`good` = glossary).
const METRICS = [
  { key: 'mrr', label: 'MRR', fmt: inr, card: true, color: 'bg-violet-500',
    hint: 'Money we earn every month if nothing changes',
    explain: 'Monthly Recurring Revenue. Number of drivers with an active plan × ₹149. It is the steady monthly income of the company right now.',
    good: 'Should go up every month. +10–20% a month is strong.' },
  { key: 'activePaid', label: 'Active paid', fmt: num, card: true, color: 'bg-emerald-500',
    hint: 'Drivers whose ₹149 plan is running now',
    explain: 'Drivers whose ₹149 plan is running. This week = live count, same as the Statistics tab (includes plans added by hand for UPI/cash payments). Past weeks = drivers who paid in the 30 days before that week ended.',
    good: 'Should keep rising week after week.' },
  { key: 'renewalRate', label: 'Renewal', fmt: pct, unit: 'pct', card: true, color: 'bg-sky-500',
    hint: 'Out of 100 plans that ended, how many paid again',
    explain: 'Of the drivers whose 30-day plan ended this week, the share who paid again (within 3 days). Low renewal means drivers did not get enough value from the app.',
    good: '70% or more is healthy, 80%+ is excellent.' },
  { key: 'conversion', label: 'Free → paid', fmt: pct, unit: 'pct', card: true, color: 'bg-amber-500',
    hint: 'Out of 100 sign-ups, how many have ever paid',
    explain: 'Everyone who has ever paid ÷ everyone who signed up since launch. Shows how well the app turns free users into paying users.',
    good: '10% or more is good at this stage.' },
  { key: 'liquidity', label: 'Liquidity', fmt: pct, unit: 'pct', card: true, color: 'bg-rose-500',
    hint: 'Out of 100 rides, how many got a call within 30 min',
    explain: 'Share of rides (WhatsApp + app-posted) that a driver contacted within 30 minutes. Low = more rides than paying drivers to take them (we need more payers). High = rides get picked up fast.',
    good: '60% or more means the marketplace is busy on both sides.' },
  { key: 'activeDrivers', label: 'Active drivers', fmt: num, card: true, color: 'bg-blue-500',
    hint: 'Drivers who actually used the app this week',
    explain: 'Drivers who contacted a ride or posted a ride this week. Sign-ups who never use the app are not counted.',
    good: 'Should rise every week. Compare it with sign-ups to see how many stay.' },
  { key: 'ltv', label: 'LTV', fmt: inr, card: true, color: 'bg-teal-500',
    hint: 'Total money one paying driver brings before leaving',
    explain: 'Lifetime Value. ₹149 ÷ the share of drivers who stop paying each month. Example: if 25% stop each month, a driver stays ~4 months → LTV ≈ ₹600. Shows "—" until the first plans end.',
    good: 'Should be at least 3× what it costs us to get one paying driver.' },
  { key: 'revenue', label: 'Revenue', fmt: inr, card: true, color: 'bg-violet-500',
    hint: 'Money actually collected this week',
    explain: 'All ₹149 payments received in this week. The current week is still running, so it grows until Sunday.',
    good: 'Compare full weeks: each week should beat the one before.' },
  { key: 'signups', label: 'Signups', fmt: num, explain: 'New drivers who created an account this week.' },
  { key: 'newPayers', label: 'New payers', fmt: num, explain: 'Drivers who paid for the very first time this week.' },
  { key: 'contacts', label: 'Contacts', fmt: num, explain: 'How many times drivers revealed a ride’s phone number this week.' },
  { key: 'rides', label: 'Rides', fmt: num, explain: 'Rides that came into the feed this week (WhatsApp groups + posted in the app).' },
]
const CHART_KEYS = ['mrr', 'activePaid', 'revenue', 'renewalRate', 'liquidity', 'activeDrivers']
const CHART_OPTIONS = METRICS.filter((m) => CHART_KEYS.includes(m.key)).map((m) => ({ id: m.key, label: m.label }))

function Cell({ m, value, target }) {
  if (value === null || value === undefined) return <td className="px-3 py-3 text-right text-ec-ink40">—</td>
  const tone = target === undefined ? '' : value >= target ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'
  return <td className={cn('px-3 py-3 text-right tabular-nums', !tone && value === 0 && 'text-ec-ink40', tone)}>{m.fmt(value)}</td>
}

export default function TrackRecordPage() {
  const { data, isLoading, isError } = useTrackRecord()
  const [chartKey, setChartKey] = useState('mrr')
  const weeks = data?.weeks ?? []
  const [now, prev] = weeks
  const chartMetric = METRICS.find((m) => m.key === chartKey)
  const chart = weeks.slice(0, 26).reverse()
    .filter((w) => w[chartKey] !== null)
    .map((w) => ({ label: `Week of ${w.week}`, value: w[chartKey] }))

  return (
    <div>
      <PageHeader
        icon={TrendingUp}
        title="Track Record"
        description={`Weekly health since launch${data ? ` (${data.since})` : ''} · Mon–Sun IST · this week is still running · reviewer excluded`}
      />

      {isLoading && <ListSkeleton />}
      {isError && <ErrorState message="Failed to load track record." />}

      {now && (
        <>
          <h2 className="mb-3 font-semibold text-ec-ink">This week <span className="text-sm font-normal text-ec-ink60">(week of {now.week})</span></h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {METRICS.filter((m) => m.card).map((m) => (
              <MetricCard key={m.key} {...m} value={now[m.key]} prev={prev?.[m.key]} target={data.targets[m.key]} />
            ))}
          </div>

          <div className={`${card} mt-6`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-ec-ink">Week by week</h2>
              <Segmented options={CHART_OPTIONS} value={chartKey} onChange={setChartKey} />
            </div>
            {chart.length > 0
              ? <BarChart data={chart} format={chartMetric.fmt} color={chartMetric.color} />
              : <p className="py-10 text-center text-sm text-ec-ink60">No data for this metric yet.</p>}
          </div>

          <div className="mt-6 overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-ec-ink60">
                    <th className="px-3 py-3 font-semibold">Week of</th>
                    {METRICS.map((m) => <th key={m.key} className="px-3 py-3 text-right font-semibold">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.week} className="border-t border-ec-line text-ec-ink transition-colors hover:bg-ec-sky/60">
                      <td className="whitespace-nowrap px-3 py-3 font-medium">{w.week}</td>
                      {METRICS.map((m) => <Cell key={m.key} m={m} value={w[m.key]} target={data.targets[m.key]} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className={`${card} mt-6`}>
            <h2 className="mb-1 font-semibold text-ec-ink">What these numbers mean</h2>
            <p className="mb-4 text-sm text-ec-ink60">Arrows compare this week with last week. For % numbers the change is in points (e.g. 60% → 65% = +5 pts).</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {METRICS.map((m) => (
                <div key={m.key} className="rounded-xl bg-slate-50 p-3">
                  <dt className="font-semibold text-ec-ink">{m.label}</dt>
                  <dd className="mt-1 text-sm text-ec-ink60">{m.explain}</dd>
                  {m.good && <dd className="mt-1 text-sm font-medium text-emerald-700">Good: {m.good}</dd>}
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-3 text-xs text-ec-ink40">
            Green = on target, amber = below (renewal {data.targets.renewalRate}%, free → paid {data.targets.conversion}%, liquidity {data.targets.liquidity}%).
            Renewal fills in once the first 30-day plans end. WhatsApp ride history is kept from the day this tab went live.
          </p>
        </>
      )}
    </div>
  )
}

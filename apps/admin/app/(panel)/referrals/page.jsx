'use client'

import { Gift } from 'lucide-react'
import { useReferrals } from '@/features/referrals/hooks/useReferrals'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { pill } from '@/lib/ui'

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
const who = (p) => (p ? `${p.name || 'No name'} (${p.phoneMasked})` : '—')

function rolloutLabel(r) {
  if (!r) return null
  if (r.all) return <span className={pill({ tone: 'green' })}>Live for everyone</span>
  if (r.testers) return <span className={pill({ tone: 'amber' })}>Testers only ({r.testers})</span>
  return <span className={pill({ tone: 'slate' })}>Off</span>
}

function Stat({ label, value }) {
  return (
    <div className="rounded-ec-card border border-ec-line bg-white px-4 py-3 shadow-ec-card">
      <p className="text-xs text-ec-ink60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ec-ink">{value ?? '—'}</p>
    </div>
  )
}

export default function ReferralsPage() {
  const r = useReferrals()
  const s = r.summary

  return (
    <div>
      <PageHeader
        icon={Gift}
        title="Referrals"
        description="Who joined on whose number. A referral counts once the new driver pays ₹149; every 2 paid referrals give the referrer 1 free month, added automatically."
        actions={rolloutLabel(r.rollout)}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Referrals" value={s?.referrals} />
        <Stat label="Paid" value={s?.paid} />
        <Stat label="Referrers" value={s?.referrers} />
        <Stat label="Free months given" value={s?.monthsGranted} />
      </div>

      <QueryState
        isLoading={r.isLoading}
        isError={r.isError}
        isEmpty={r.items.length === 0}
        errorMessage="Failed to load referrals."
        emptyMessage="No referrals yet"
        emptyHint="When a new driver enters a referrer's number after signing up, they show up here."
      >
        <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
          {r.items.map((x) => (
            <li key={x.id} className="flex flex-col gap-2 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-ec-ink">{who(x.referee)}</p>
                <p className="mt-0.5 text-xs text-ec-ink60">Referred by {who(x.referrer)} · joined {when(x.joinedAt)}</p>
              </div>
              <div className="flex gap-2">
                <span className={pill({ tone: x.paid ? 'green' : 'gray' })}>{x.paid ? 'Paid' : 'Not paid'}</span>
                {x.rewarded && <span className={pill({ tone: 'blue' })}>Counted in reward</span>}
              </div>
            </li>
          ))}
        </ul>
      </QueryState>

      <Pagination page={r.page} total={r.total} limit={r.limit} onChange={r.setPage} />
    </div>
  )
}

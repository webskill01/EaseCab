'use client'

import { Gift } from 'lucide-react'
import { useReferrals } from '@/features/referrals/hooks/useReferrals'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { ListFilters } from '@/features/shell/components/ListFilters'
import { Avatar } from '@/features/shell/components/Avatar'
import { PhoneLink } from '@/features/shell/components/PhoneLink'
import { pill } from '@/lib/ui'

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'unpaid', label: 'Not paid' },
  { id: 'rewarded', label: 'Counted in reward' },
]

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
]

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
function Who({ p }) {
  if (!p) return '—'
  return <>{p.name || 'No name'} <PhoneLink phone={p.phone} className="text-ec-ink60" /></>
}

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

      <ListFilters
        q={r.q}
        onSearch={r.setQ}
        placeholder="Search driver or referrer"
        rows={[
          { label: 'Status', options: STATUSES, value: r.status, onChange: r.setStatus },
          { label: 'Sort', options: SORTS, value: r.sort, onChange: r.setSort },
        ]}
      />

      <QueryState
        isLoading={r.isLoading}
        isError={r.isError}
        isEmpty={r.items.length === 0}
        emptyMessage={r.q || r.status !== 'all' ? 'No referrals match these filters.' : 'No referrals yet'}
        errorMessage="Failed to load referrals."
        emptyHint="When a new driver enters a referrer's number after signing up, they show up here."
      >
        <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
          {r.items.map((x) => (
            <li key={x.id} className="flex flex-col gap-2 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={x.referee?.name} src={x.referee?.avatarUrl} />
                <div className="min-w-0">
                  <p className="font-medium text-ec-ink"><Who p={x.referee} /></p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-ec-ink60">
                    Referred by
                    {x.referrer && <Avatar name={x.referrer.name} src={x.referrer.avatarUrl} size="h-5 w-5 text-[9px] ring-1" />}
                    <Who p={x.referrer} /> · joined {when(x.joinedAt)}
                  </p>
                </div>
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

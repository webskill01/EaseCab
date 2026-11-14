'use client'

import { RefreshCw } from 'lucide-react'
import { useRenewals } from '@/features/renewals/hooks/useRenewals'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { Avatar } from '@/features/shell/components/Avatar'
import { PhoneLink } from '@/features/shell/components/PhoneLink'
import { pill } from '@/lib/ui'

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
const inr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`
/** 2 → "2nd", 11 → "11th", 23 → "23rd". */
function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th')
  return `${n}${suffix}`
}

export default function RenewalsPage() {
  const r = useRenewals()

  return (
    <div>
      <PageHeader
        icon={RefreshCw}
        title="Renewals"
        description="Every payment from a driver who had paid before, newest first, since launch. Test accounts and free members are left out."
        actions={<span className={pill({ tone: 'blue' })}>{r.total} renewals</span>}
      />

      <QueryState
        isLoading={r.isLoading}
        isError={r.isError}
        isEmpty={r.items.length === 0}
        emptyMessage="No renewals yet"
        errorMessage="Failed to load renewals."
        emptyHint="When a driver pays a second time, it shows up here."
      >
        <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
          {r.items.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={p.member.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-ec-ink">{p.member.name || 'Driver'}</p>
                  <PhoneLink phone={p.member.phone} className="text-xs text-ec-ink60" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="font-medium tabular-nums text-ec-ink">{inr(p.amount)}</span>
                {p.months && <span className={pill({ tone: 'slate' })}>{p.months} mo</span>}
                <span className={pill({ tone: 'green' })}>{ordinal(p.nth)} payment</span>
                <span className="text-xs text-ec-ink60">{when(p.paidAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>

      <Pagination page={r.page} total={r.total} limit={r.limit} onChange={r.setPage} />
    </div>
  )
}

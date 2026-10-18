'use client'

import { useState } from 'react'
import { HandCoins, CheckCircle2 } from 'lucide-react'
import { useFounderPayments } from '@/features/founderPayments/hooks/useFounderPayments'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { button, pill, input } from '@/lib/ui'

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
const inr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

/** One unlinked payment: member phone + "also add 30 days" + Link. */
function LinkForm({ id, link }) {
  const [phone, setPhone] = useState('')
  const [grant, setGrant] = useState(true)
  const busy = link.isPending && link.variables?.id === id

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => { e.preventDefault(); link.mutate({ id, phone, grantMembership: grant }) }}
    >
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder="Member's mobile number"
        aria-label="Member's mobile number"
        className={`${input} sm:w-48`}
      />
      <label className="flex items-center gap-2 text-xs text-ec-ink60">
        <input type="checkbox" checked={grant} onChange={(e) => setGrant(e.target.checked)} />
        Also add 30 days membership
      </label>
      <button type="submit" disabled={busy || phone.trim().length < 10} className={button({ variant: 'primary', size: 'sm' })}>
        Link
      </button>
    </form>
  )
}

export default function FounderPaymentsPage() {
  const f = useFounderPayments()

  return (
    <div>
      <PageHeader
        icon={HandCoins}
        title="Founder payments"
        tone="from-amber-500 to-orange-600"
        description="When a driver pays you ₹149 on your own UPI, pay ₹149 in the app from the founder account, then link that payment to the driver here. Stats then count the driver as the payer. Untick “Also add 30 days” if you already added their plan by hand."
        actions={<span className={pill({ tone: f.unlinked ? 'amber' : 'green' })}>{f.unlinked} to link</span>}
      />

      <QueryState
        isLoading={f.isLoading}
        isError={f.isError}
        isEmpty={f.items.length === 0}
        errorMessage="Failed to load payments."
        emptyMessage="No founder payments yet"
        emptyHint="Payments made in the app from the founder account since launch show up here."
      >
        <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
          {f.items.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-ec-ink">{inr(p.amount)} · {when(p.paidAt)}</p>
                {p.member
                  ? <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={13} /> For {p.member.name || 'member'} ({p.member.phoneMasked})</p>
                  : <p className="mt-0.5 text-xs text-amber-700">Not linked yet</p>}
              </div>
              {!p.member && <LinkForm id={p.id} link={f.link} />}
            </li>
          ))}
        </ul>
      </QueryState>

      <Pagination page={f.page} total={f.total} limit={f.limit} onChange={f.setPage} />
    </div>
  )
}

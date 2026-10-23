'use client'

import { useState } from 'react'
import { Users, Search } from 'lucide-react'
import { useUsers } from '@/features/users/hooks/useUsers'
import { UserCard } from '@/features/users/components/UserCard'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { Segmented } from '@/features/shell/components/Segmented'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { button, input } from '@/lib/ui'

const PLANS = [
  { id: 'all', label: 'Everyone' },
  { id: 'active', label: 'Active members' },
  { id: 'expired', label: 'Expired' },
  { id: 'none', label: 'Never paid' },
]

const STATUSES = [
  { id: 'active', label: 'Live' },
  { id: 'deleted', label: 'Deleted' },
  { id: 'all', label: 'All' },
]

const JOINED = [
  { id: 'launch', label: 'Since launch' },
  { id: 'all', label: 'Incl. test' },
]

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ec-ink40">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export default function UsersPage() {
  const u = useUsers()
  const [term, setTerm] = useState('')

  function submitSearch(e) {
    e.preventDefault()
    u.setQ(term.trim())
  }

  return (
    <div>
      <PageHeader icon={Users} title="Users" count={u.total} description="Find drivers, see who is a paying member, open a full profile, soft-delete or restore." />

      <div className="mb-4 space-y-3 rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card">
        <form onSubmit={submitSearch} className="flex gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search phone or name" className={`${input} pl-9`} />
          </div>
          <button type="submit" className={`${button({ variant: 'primary' })} shrink-0`}>Search</button>
        </form>
        <FilterRow label="Plan"><Segmented options={PLANS} value={u.plan} onChange={u.setPlan} /></FilterRow>
        <FilterRow label="Account"><Segmented options={STATUSES} value={u.status} onChange={u.setStatus} /></FilterRow>
        <FilterRow label="Joined"><Segmented options={JOINED} value={u.joined} onChange={u.setJoined} /></FilterRow>
      </div>

      {u.q !== '' && (
        <p className="mb-3 text-xs text-ec-ink60">
          Filtered by “{u.q}” · <button type="button" onClick={() => { setTerm(''); u.setQ('') }} className="font-medium text-ec-blue hover:underline">clear</button>
        </p>
      )}

      <QueryState isLoading={u.isLoading} isError={u.isError} isEmpty={u.items.length === 0} errorMessage="Failed to load users." emptyMessage="No users match these filters.">
        <div className="grid gap-3 xl:grid-cols-2">
          {u.items.map((user) => (
            <UserCard key={user.id} user={user} onAction={(id, act) => u.action.mutate({ userId: id, action: act })} />
          ))}
        </div>
      </QueryState>

      <Pagination page={u.page} total={u.total} limit={u.limit} onChange={u.setPage} />
    </div>
  )
}

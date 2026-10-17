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

const STATUSES = [
  { id: 'active', label: 'Active' },
  { id: 'deleted', label: 'Deleted' },
  { id: 'all', label: 'All' },
]

export default function UsersPage() {
  const { items, total, limit, status, setStatus, q, setQ, page, setPage, isLoading, isError, action } = useUsers()
  const [term, setTerm] = useState('')

  function submitSearch(e) {
    e.preventDefault()
    setQ(term.trim())
  }

  return (
    <div>
      <PageHeader icon={Users} title="Users" count={total} tone="from-sky-500 to-blue-600" description="Search drivers, check their badge and plan, soft-delete or restore." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search phone or name" className={`${input} pl-9`} />
          </div>
          <button type="submit" className={`${button({ variant: 'primary' })} shrink-0`}>Search</button>
        </form>
        <Segmented options={STATUSES} value={status} onChange={setStatus} />
      </div>

      {q !== '' && (
        <p className="mb-3 text-xs text-ec-ink60">
          Filtered by “{q}” · <button type="button" onClick={() => { setTerm(''); setQ('') }} className="font-medium text-ec-blue hover:underline">clear</button>
        </p>
      )}

      <QueryState isLoading={isLoading} isError={isError} isEmpty={items.length === 0} errorMessage="Failed to load users." emptyMessage="No users.">
        <div className="flex flex-col gap-3">
          {items.map((u) => (
            <UserCard key={u.id} user={u} onAction={(id, act) => action.mutate({ userId: id, action: act })} />
          ))}
        </div>
      </QueryState>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  )
}

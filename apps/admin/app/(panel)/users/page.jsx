'use client'

import { useState } from 'react'
import { useUsers } from '@/features/users/hooks/useUsers'
import { UserCard } from '@/features/users/components/UserCard'

export default function UsersPage() {
  const { items, total, status, setStatus, q, setQ, page, setPage, isLoading, isError, action } = useUsers()
  const [term, setTerm] = useState('')

  function submitSearch(e) {
    e.preventDefault()
    setPage(1)
    setQ(term.trim())
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ec-ink">
          Users <span className="text-sm font-normal text-ec-ink60">({total})</span>
        </h1>
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value) }}
          className="rounded-md border px-2 py-1 text-sm text-ec-ink"
        >
          <option value="active">Active</option>
          <option value="deleted">Deleted</option>
          <option value="all">All</option>
        </select>
      </div>

      <form onSubmit={submitSearch} className="mt-3 flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search phone or name"
          className="flex-1 rounded-md border px-3 py-1.5 text-sm text-ec-ink"
        />
        <button type="submit" className="rounded-md bg-ec-blue px-3 py-1.5 text-sm font-medium text-white">Search</button>
      </form>

      {isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Failed to load users.</p>}
      {!isLoading && !isError && items.length === 0 && <p className="mt-4 text-sm text-ec-ink60">No users.</p>}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((u) => (
          <UserCard key={u.id} user={u} onAction={(id, act) => action.mutate({ userId: id, action: act })} />
        ))}
      </div>

      {q !== '' && <p className="mt-2 text-xs text-ec-ink60">Filtered by “{q}”. Page {page}.</p>}
    </div>
  )
}

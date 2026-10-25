'use client'

import { Users } from 'lucide-react'
import { useUsers } from '@/features/users/hooks/useUsers'
import { UserCard } from '@/features/users/components/UserCard'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { ListFilters } from '@/features/shell/components/ListFilters'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'

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

export default function UsersPage() {
  const u = useUsers()
  return (
    <div>
      <PageHeader icon={Users} title="Users" count={u.total} description="Find drivers, see who is a paying member, open a full profile, soft-delete or restore." />

      <ListFilters
        q={u.q}
        onSearch={u.setQ}
        rows={[
          { label: 'Plan', options: PLANS, value: u.plan, onChange: u.setPlan },
          { label: 'Account', options: STATUSES, value: u.status, onChange: u.setStatus },
          { label: 'Joined', options: JOINED, value: u.joined, onChange: u.setJoined },
        ]}
      />

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

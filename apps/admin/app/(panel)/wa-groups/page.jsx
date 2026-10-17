'use client'

import { MessagesSquare, Search, Power, PowerOff, Users } from 'lucide-react'
import { useWaGroups } from '@/features/wa-groups/hooks/useWaGroups'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { Segmented } from '@/features/shell/components/Segmented'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { button, pill, input } from '@/lib/ui'
import { cn } from '@/lib/utils'

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'on', label: 'Reading' },
  { id: 'off', label: 'Switched off' },
]

function lastSeen(iso) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
}

/** iOS-style switch; green = bot reads rides from this group. */
function Switch({ on, label, disabled, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40', on ? 'bg-emerald-500' : 'bg-slate-300')}
    >
      <span className={cn('absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  )
}

export default function WaGroupsPage() {
  const g = useWaGroups()
  const scope = g.q ? `matching "${g.q}"` : 'all groups'

  return (
    <div>
      <PageHeader
        icon={MessagesSquare}
        title="WhatsApp Groups"
        tone="from-green-500 to-emerald-600"
        description="Every group the bot's number is in shows up here and is read by default. Switch a group off to stop taking rides from it — the bot applies it within seconds."
        actions={
          <>
            <span className={pill({ tone: 'green' })}>{g.counts.on} reading</span>
            <span className={pill({ tone: 'slate' })}>{g.counts.off} off</span>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
          <input value={g.q} onChange={(e) => g.setQ(e.target.value)} placeholder="Search name or JID" className={`${input} pl-9`} />
        </div>
        <Segmented options={STATUSES} value={g.status} onChange={g.setStatus} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={g.bulk.isPending} onClick={() => g.bulk.mutate(true)} className={button({ size: 'sm' })}>
          <Power size={14} className="text-emerald-600" /> Turn on {scope}
        </button>
        <button type="button" disabled={g.bulk.isPending} onClick={() => g.bulk.mutate(false)} className={button({ variant: 'dangerOutline', size: 'sm' })}>
          <PowerOff size={14} /> Turn off {scope}
        </button>
        {g.bulk.data && <span className="text-xs font-medium text-emerald-700">Switched {g.bulk.data.updated}</span>}
      </div>

      <div className="mt-4">
        <QueryState
          isLoading={g.isLoading}
          isError={g.isError}
          isEmpty={g.items.length === 0}
          errorMessage="Failed to load groups."
          emptyMessage="No groups yet"
          emptyHint="They appear after the bot connects."
        >
          <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
            {g.items.map((row) => (
              <li key={row.id} className={cn('flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-ec-sky/50', !row.enabled && 'bg-slate-50/80')}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', row.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500')}>
                    <Users size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className={cn('truncate font-medium', row.enabled ? 'text-ec-ink' : 'text-ec-ink60')}>{row.name || 'Unnamed group'}</p>
                    <p className="truncate text-xs text-ec-ink60">
                      {row.participants ?? '?'} members · seen {lastSeen(row.lastSeenAt)} · {row.jid}
                    </p>
                  </div>
                </div>
                <Switch
                  on={row.enabled}
                  label={`Read rides from ${row.name || row.jid}`}
                  disabled={g.toggle.isPending}
                  onToggle={() => g.toggle.mutate({ id: row.id, enabled: !row.enabled })}
                />
              </li>
            ))}
          </ul>
        </QueryState>
      </div>

      <Pagination page={g.page} total={g.total} limit={g.limit} onChange={g.setPage} />
    </div>
  )
}

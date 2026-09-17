'use client'

import { useWaGroups } from '@/features/wa-groups/hooks/useWaGroups'

const STATUSES = [
  { id: 'all', label: 'All' },
  { id: 'on', label: 'Reading' },
  { id: 'off', label: 'Switched off' },
]

function lastSeen(iso) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
}

export default function WaGroupsPage() {
  const g = useWaGroups()
  const scope = g.q ? `matching "${g.q}"` : 'all groups'

  return (
    <div>
      <h1 className="text-xl font-semibold text-ec-ink">
        WhatsApp Groups{' '}
        <span className="text-sm font-normal text-ec-ink60">({g.counts.on} reading · {g.counts.off} off)</span>
      </h1>
      <p className="mt-1 text-sm text-ec-ink60">
        Every group the bot&apos;s number is in shows up here automatically and is read by default. Switch a group off to
        stop taking rides from it — the bot applies it within seconds.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={g.q}
          onChange={(e) => g.setQ(e.target.value)}
          placeholder="Search name or JID"
          className="w-full rounded-md border px-3 py-2 text-sm sm:w-64"
        />
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => g.setStatus(s.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${s.id === g.status ? 'bg-ec-ink text-white' : 'text-ec-ink'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" disabled={g.bulk.isPending} onClick={() => g.bulk.mutate(true)} className="rounded-md border px-3 py-1.5 text-ec-ink disabled:opacity-40">
          Turn on {scope}
        </button>
        <button type="button" disabled={g.bulk.isPending} onClick={() => g.bulk.mutate(false)} className="rounded-md border px-3 py-1.5 text-red-600 disabled:opacity-40">
          Turn off {scope}
        </button>
        {g.bulk.data && <span className="self-center text-xs text-ec-ink60">Switched {g.bulk.data.updated}</span>}
      </div>
      {(g.toggle.isError || g.bulk.isError) && <p className="mt-1 text-xs text-red-600">Could not save the switch. Try again.</p>}

      {g.isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {g.isError && <p className="mt-4 text-sm text-red-600">Failed to load groups.</p>}
      {!g.isLoading && !g.isError && g.items.length === 0 && (
        <p className="mt-4 text-sm text-ec-ink60">No groups yet — they appear after the bot connects.</p>
      )}

      {g.items.length > 0 && (
        <ul className="mt-3 divide-y rounded-md border bg-card">
          {g.items.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-ec-ink">{row.name || 'Unnamed group'}</p>
                <p className="truncate text-xs text-ec-ink60">
                  {row.participants ?? '?'} members · seen {lastSeen(row.lastSeenAt)} · {row.jid}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={row.enabled}
                aria-label={`Read rides from ${row.name || row.jid}`}
                disabled={g.toggle.isPending}
                onClick={() => g.toggle.mutate({ id: row.id, enabled: !row.enabled })}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40 ${row.enabled ? 'bg-green-600 text-white' : 'bg-muted text-ec-ink60'}`}
              >
                {row.enabled ? 'Reading' : 'Off'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {g.total > g.limit && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button type="button" disabled={g.page <= 1} onClick={() => g.setPage(g.page - 1)} className="rounded-md border px-3 py-1.5 text-ec-ink disabled:opacity-40">Prev</button>
          <span className="text-ec-ink60">Page {g.page} of {Math.ceil(g.total / g.limit)}</span>
          <button type="button" disabled={g.page * g.limit >= g.total} onClick={() => g.setPage(g.page + 1)} className="rounded-md border px-3 py-1.5 text-ec-ink disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}

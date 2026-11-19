'use client'

import { Link2, Search, ExternalLink, Ban, Undo2, Users, Smartphone, Clock } from 'lucide-react'
import { useWaInvites } from '@/features/wa-invites/hooks/useWaInvites'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { Segmented } from '@/features/shell/components/Segmented'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { button, pill, input } from '@/lib/ui'
import { cn } from '@/lib/utils'

const EMPTY = {
  new: ['No new links', 'Links appear as the bot sees them shared in groups.'],
  requested: ['No requests pending', 'Links you tapped Join on wait here until a session is in the group.'],
  later: ['Nothing saved for later', 'Tap Later on a new link to park it here.'],
  joined: ['Nothing joined yet', 'A link moves here once any session is in that group.'],
  avoided: ['Nothing avoided', 'Avoided links never come back to New.'],
  invalid: ['No dead links', 'Revoked or expired links land here.'],
}

function when(iso) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
}

const CAN_JOIN = new Set(['new', 'later'])

function LinkRow({ row, busy, onStatus }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-ec-sky/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Users size={16} /></span>
        <div className="min-w-0">
          <p className="truncate font-medium text-ec-ink">{row.name || 'Name not known yet'}</p>
          <a href={row.url} target="_blank" rel="noopener noreferrer" className="block break-all text-xs text-ec-blue hover:underline">{row.url}</a>
          <p className="text-xs text-ec-ink60">
            {row.size != null ? `${row.size} members · ` : ''}
            shared in {row.sourceGroupName || 'a group'} · seen {row.seenCount}× · last {when(row.lastSeenAt)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {row.sessions.map((s) => <span key={s} className={pill({ tone: 'blue' })}><Smartphone size={11} />{s}</span>)}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">
        {row.status === 'avoided' && (
          <button type="button" disabled={busy} onClick={() => onStatus('new')} className={button({ size: 'sm' })}><Undo2 size={14} /> Restore</button>
        )}
        {CAN_JOIN.has(row.status) && (
          // Opens WhatsApp and files the link under Request sent; the bot moves it to Joined once in.
          <a href={row.url} target="_blank" rel="noopener noreferrer" onClick={() => onStatus('requested')} className={button({ variant: 'success', size: 'sm' })}><ExternalLink size={14} /> Join</a>
        )}
        {(row.status === 'requested' || row.status === 'joined') && (
          <a href={row.url} target="_blank" rel="noopener noreferrer" className={button({ size: 'sm' })}><ExternalLink size={14} /> Open</a>
        )}
        {row.status === 'new' && (
          <button type="button" disabled={busy} onClick={() => onStatus('later')} className={button({ size: 'sm' })}><Clock size={14} /> Later</button>
        )}
        {(row.status === 'later' || row.status === 'requested') && (
          <button type="button" disabled={busy} onClick={() => onStatus('new')} className={button({ size: 'sm' })}><Undo2 size={14} /> Back to New</button>
        )}
        {CAN_JOIN.has(row.status) && (
          <button type="button" disabled={busy} onClick={() => onStatus('avoided')} className={button({ variant: 'dangerOutline', size: 'sm' })}><Ban size={14} /> Avoid</button>
        )}
      </div>
    </li>
  )
}

export default function WaInvitesPage() {
  const g = useWaInvites()
  const tabs = [
    { id: 'new', label: `New (${g.counts.new})` },
    { id: 'requested', label: `Request sent (${g.counts.requested})` },
    { id: 'later', label: `Later (${g.counts.later})` },
    { id: 'joined', label: `Joined (${g.counts.joined})` },
    { id: 'avoided', label: `Avoided (${g.counts.avoided})` },
    { id: 'invalid', label: `Dead (${g.counts.invalid})` },
  ]
  const [emptyMessage, emptyHint] = EMPTY[g.status] || EMPTY.new

  return (
    <div>
      <PageHeader
        icon={Link2}
        title="Group Links"
        description="WhatsApp group links shared in any group the bot's sessions are in, each listed once however often it is shared. Join opens WhatsApp and moves the link to Request sent; once any session is in the group it moves to Joined by itself. Later parks a link to keep New fresh. Avoid hides it for good."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
          <input value={g.q} onChange={(e) => g.setQ(e.target.value)} placeholder="Search group name" className={`${input} pl-9`} />
        </div>
        <Segmented options={tabs} value={g.status} onChange={g.setStatus} />
      </div>

      <div className="mt-4">
        <QueryState isLoading={g.isLoading} isError={g.isError} isEmpty={g.items.length === 0} errorMessage="Failed to load links." emptyMessage={emptyMessage} emptyHint={emptyHint}>
          <ul className={cn('divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card')}>
            {g.items.map((row) => (
              <LinkRow key={row.id} row={row} busy={g.setLinkStatus.isPending} onStatus={(status) => g.setLinkStatus.mutate({ id: row.id, status })} />
            ))}
          </ul>
        </QueryState>
      </div>

      <Pagination page={g.page} total={g.total} limit={g.limit} onChange={g.setPage} />
    </div>
  )
}

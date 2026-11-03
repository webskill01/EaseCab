'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
import { fetchSessionAnalytics, resetSessionAnalytics, fetchSessionGroups } from '../services/waSessionsApi'
import { button, pill } from '@/lib/ui'
import { ago } from './SessionCard'

const PERIODS = [['day', 'Last 24h'], ['week', '7 days'], ['month', '30 days'], ['all', 'All time']]
// What each ingest outcome means, in the order the oracle panel showed them.
const OUTCOMES = [
  ['saved', 'Rides saved'],
  ['duplicate', 'Duplicates skipped'],
  ['claimed_elsewhere', 'Taken by another number'],
  ['not_ride', 'Not a ride post'],
  ['no_phone', 'No phone number'],
  ['no_route', 'No pickup/drop city'],
  ['blocked_sender', 'Blocked sender'],
  ['blocked_number', 'Blocked number'],
  ['error', 'Errors'],
]
const secs = (ms) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`)
const fmt = (t) => new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function Grid({ title, rows }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ec-ink40">{title}</p>
      <dl className="grid grid-cols-[1fr_auto] overflow-hidden rounded-lg border border-ec-line text-sm">
        {rows.map(([k, v]) => [
          <dt key={`${k}-k`} className="border-b border-ec-line px-3 py-1.5 text-ec-ink60 last-of-type:border-0">{k}</dt>,
          <dd key={`${k}-v`} className="border-b border-ec-line px-3 py-1.5 text-right font-semibold tabular-nums text-ec-ink">{v}</dd>,
        ])}
      </dl>
    </div>
  )
}

/** Rides per pickup city over a rolling window, resettable. */
function RideAnalytics({ id }) {
  const qc = useQueryClient()
  const [period, setPeriod] = useState('day')
  const q = useQuery({ queryKey: ['waSessionAnalytics', id, period], queryFn: () => fetchSessionAnalytics(id, period) })
  const reset = useMutation({
    mutationFn: () => resetSessionAnalytics(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waSessionAnalytics', id] })
      qc.invalidateQueries({ queryKey: ['waSessions'] })
    },
  })
  const d = q.data
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map(([p, label]) => (
          <button key={p} type="button" onClick={() => setPeriod(p)} className={button({ size: 'sm', variant: p === period ? 'primary' : 'outline' })}>{label}</button>
        ))}
      </div>
      {q.isLoading && <p className="flex items-center gap-2 text-sm text-ec-ink60"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
      {q.isError && <p className="text-sm text-red-600">Could not load ride counts.</p>}
      {d && (
        <>
          <p className="text-xs text-ec-ink60">{d.from ? `${fmt(d.from)} → ${fmt(d.until)} IST` : 'Since counting started'} · <b className="text-ec-ink">{d.total} rides</b></p>
          {d.cities.length === 0
            ? <p className="text-sm text-ec-ink60">No rides in this period.</p>
            : <Grid title="Rides by pickup city" rows={d.cities.map((c) => [c.city || 'Unknown city', c.count])} />}
        </>
      )}
      <button
        type="button"
        disabled={reset.isPending}
        onClick={() => window.confirm('Clear all ride counts for this session? This cannot be undone.') && reset.mutate()}
        className={button({ size: 'sm', variant: 'dangerOutline' })}
      >
        <Trash2 size={14} /> Reset counts
      </button>
    </div>
  )
}

/** Stats panel: ride analytics, message outcomes, connection health. */
export function SessionStats({ s }) {
  const o = s.outcomes || {}
  const seen = Object.values(o).reduce((a, b) => a + b, 0)
  const live = s.status === 'live'
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RideAnalytics id={s.id} />
      <div className="space-y-3">
        {s.delay ? (
          <Grid
            title={`Speed: WhatsApp group → app (last ${s.delay.samples} rides)`}
            rows={[['Typical delay', secs(s.delay.median)], ['Slowest 5%', secs(s.delay.p95)], ['Slowest', secs(s.delay.max)]]}
          />
        ) : (
          <p className="text-xs text-ec-ink60">Speed shows after this number saves its first rides.</p>
        )}
        <Grid title="Messages" rows={[['Processed', seen], ...OUTCOMES.filter(([k]) => o[k]).map(([k, label]) => [label, o[k]])]} />
        <Grid
          title="Connection"
          rows={[
            ['Connected since', live && s.statusSince ? ago(s.statusSince).replace(' ago', '') : '—'],
            ['Reconnects', s.reconnects ?? 0],
            ['Bot running for', s.botStartedAt ? ago(s.botStartedAt).replace(' ago', '') : '—'],
            ['Last message', ago(s.lastMsgAt)],
          ]}
        />
      </div>
    </div>
  )
}

/** Groups this number is in (names come from the Groups tab's records). */
export function SessionGroups({ id }) {
  const q = useQuery({ queryKey: ['waSessionGroups', id], queryFn: () => fetchSessionGroups(id) })
  if (q.isLoading) return <p className="flex items-center gap-2 text-sm text-ec-ink60"><Loader2 size={14} className="animate-spin" /> Loading groups…</p>
  if (q.isError) return <p className="text-sm text-red-600">Could not load groups.</p>
  if (!q.data.length) return <p className="text-sm text-ec-ink60">No groups yet. They show up once the number is linked and connected.</p>
  return (
    <ul className="divide-y divide-ec-line overflow-y-auto rounded-lg border border-ec-line text-sm">
      {q.data.map((g) => (
        <li key={g.jid} className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="min-w-0 truncate text-ec-ink">{g.name || <span className="font-mono text-xs text-ec-ink40">{g.jid}</span>}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-ec-ink60">
            {g.participants != null && `${g.participants} members`}
            {!g.enabled && <span className={pill({ tone: 'slate' })}>ignored</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Smartphone, Link2, Trash2, Pencil, Check, X, Share2, Copy, Pause, Play, BarChart3, Users } from 'lucide-react'
import { PairPanel } from './PairPanel'
import { SessionStats, SessionGroups } from './SessionStats'
import { createShareLink } from '../services/waSessionsApi'
import { button, pill, input, card } from '@/lib/ui'
import { cn } from '@/lib/utils'

export const STATUS = {
  live: { label: 'Live', tone: 'green' },
  connecting: { label: 'Connecting', tone: 'amber' },
  down: { label: 'Down — retrying', tone: 'red' },
  logged_out: { label: 'Logged out — pair again', tone: 'red' },
  not_paired: { label: 'Not linked', tone: 'slate' },
  paused: { label: 'Paused', tone: 'slate' },
  offline: { label: 'Bot offline', tone: 'red' },
}

/** "3m ago" style. */
export function ago(ms) {
  if (!ms) return 'never'
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ec-ink40">{label}</p>
      <p className="text-lg font-bold text-ec-ink">{value}</p>
      {hint && <p className="text-[11px] text-ec-ink60">{hint}</p>}
    </div>
  )
}

/** Share link box: copy, or send over WhatsApp, so someone remote can scan. */
function ShareBox({ id }) {
  const [link, setLink] = useState(null)
  const [err, setErr] = useState(false)
  const make = async () => {
    try {
      const { token } = await createShareLink(id)
      setLink(`${window.location.origin}/pair/${token}`)
    } catch {
      setErr(true)
    }
  }
  if (!link) {
    return (
      <button type="button" onClick={make} className={button({ size: 'sm' })}>
        <Share2 size={14} /> {err ? 'Failed — try again' : 'Make share link'}
      </button>
    )
  }
  const text = encodeURIComponent(`Open this and scan the QR with your WhatsApp to link it to EaseCab: ${link}`)
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-ec-line p-3">
      <p className="break-all font-mono text-xs text-ec-ink">{link}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className={button({ size: 'sm' })}><Copy size={14} /> Copy</button>
        <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer" className={button({ size: 'sm', variant: 'success' })}>Send on WhatsApp</a>
      </div>
      <p className="text-[11px] text-ec-ink60">Valid 30 minutes. Anyone with it can link a number to this session, so share it only with that person.</p>
    </div>
  )
}

/** Popup over the page (closes on backdrop click, X or Escape) so panels don't stretch the list. */
function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={cn('flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-ec-float animate-in slide-in-from-bottom-8 sm:rounded-2xl', wide ? 'max-w-3xl' : 'max-w-md')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ec-line px-5 py-3">
          <h2 className="truncate font-semibold text-ec-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className={button({ size: 'sm', variant: 'ghost' })}><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

/** Inline rename. */
function NameEdit({ s, update }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(s.name)
  if (!editing) {
    return (
      <button type="button" onClick={() => { setName(s.name); setEditing(true) }} className="group flex min-w-0 items-center gap-1.5 text-left">
        <span className="truncate text-base font-bold text-ec-ink">{s.name}</span>
        <Pencil size={13} className="shrink-0 text-ec-ink40 group-hover:text-ec-blue" />
      </button>
    )
  }
  const save = () => { update.mutate({ id: s.id, name: name.trim() }); setEditing(false) }
  return (
    <div className="flex items-center gap-1.5">
      <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()} className={cn(input, 'h-8')} />
      <button type="button" aria-label="Save name" disabled={!name.trim()} onClick={save} className={button({ size: 'sm', variant: 'primary' })}><Check size={14} /></button>
      <button type="button" aria-label="Cancel" onClick={() => setEditing(false)} className={button({ size: 'sm', variant: 'ghost' })}><X size={14} /></button>
    </div>
  )
}

/** One WhatsApp session: live status, stats, and every action. */
export function SessionCard({ s, update, remove }) {
  const [panel, setPanel] = useState(null) // 'pair' | 'share' | 'stats' | 'groups' | null
  const st = STATUS[s.status] || STATUS.offline
  const o = s.outcomes || {}
  const seen = Object.values(o).reduce((a, b) => a + b, 0)
  const dupes = (o.duplicate || 0) + (o.claimed_elsewhere || 0)
  const needsPair = ['not_paired', 'logged_out'].includes(s.status)
  const close = () => setPanel(null)

  return (
    <li className={cn(card, 'space-y-3', !s.enabled && 'bg-slate-50/80')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <NameEdit s={s} update={update} />
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ec-ink60">
            <span className="inline-flex items-center gap-1"><Smartphone size={12} /> {s.phone ? `+${s.phone}` : 'no number yet'}</span>
            <span>· {s.slot}</span>
            <span>· last message {ago(s.lastMsgAt)}</span>
          </p>
        </div>
        <span className={cn(pill({ tone: st.tone }), 'shrink-0')}>
          {s.status === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
          {st.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Rides (all time)" value={s.ridesSaved} />
        <Stat label="Rides (24h)" value={s.rides24h} />
        <Stat label="Groups" value={s.groups.total} hint={`${s.groups.unique} not in any other number`} />
        <Stat label="Messages" value={seen} hint={`${dupes} duplicates skipped`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPanel('pair')} className={button({ size: 'sm', variant: needsPair ? 'primary' : 'outline' })}>
          <Link2 size={14} /> {needsPair ? 'Link number' : 'Re-link'}
        </button>
        {/* A share link only links a number; a live session would refuse it (409), so hide it then. */}
        {s.status !== 'live' && (
          <button type="button" onClick={() => setPanel('share')} className={button({ size: 'sm' })}><Share2 size={14} /> Share scanner</button>
        )}
        <button type="button" onClick={() => setPanel('stats')} className={button({ size: 'sm' })}><BarChart3 size={14} /> Stats</button>
        <button type="button" onClick={() => setPanel('groups')} className={button({ size: 'sm' })}><Users size={14} /> Groups</button>
        <button type="button" disabled={update.isPending} onClick={() => update.mutate({ id: s.id, enabled: !s.enabled })} className={button({ size: 'sm' })}>
          {s.enabled ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
        </button>
        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => window.confirm(`Remove "${s.name}"? The number is logged out of the bot.`) && remove.mutate(s.id)}
          className={button({ size: 'sm', variant: 'dangerOutline' })}
        >
          <Trash2 size={14} /> Remove
        </button>
      </div>

      {panel === 'pair' && (
        <Modal title={`${needsPair ? 'Link a number' : 'Re-link'} · ${s.name}`} onClose={close}>
          {!needsPair && <p className="mb-2 text-xs font-medium text-amber-700">Re-linking replaces the number currently on this session.</p>}
          <PairPanel id={s.id} />
        </Modal>
      )}
      {panel === 'share' && <Modal title={`Share scanner · ${s.name}`} onClose={close}><ShareBox id={s.id} /></Modal>}
      {panel === 'stats' && <Modal title={`Stats · ${s.name}`} onClose={close} wide><SessionStats s={s} /></Modal>}
      {panel === 'groups' && <Modal title={`Groups (${s.groups.total}) · ${s.name}`} onClose={close}><SessionGroups id={s.id} /></Modal>}
    </li>
  )
}

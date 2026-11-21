'use client'

import { Check, X, MapPin, Flame, Ban } from 'lucide-react'
import { button, pill, card } from '@/lib/ui'
import { UserLink } from '@/features/shell/components/UserLink'

const REPORT = { cng_yes: { label: 'CNG available', tone: 'green' }, cng_no: { label: 'No CNG', tone: 'amber' }, closed: { label: 'Closed', tone: 'red' } }
const FUELS = [['hasCng', 'CNG'], ['hasPetrol', 'Petrol'], ['hasDiesel', 'Diesel']]
const mapUrl = (s) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
const day = (d) => new Date(d).toLocaleDateString('en-IN')

/** Pending station → Approve / Reject. Reported station → act on the reports, or Dismiss them. */
function Actions({ s, onDecide }) {
  const act = (patch) => () => onDecide(s.id, patch)
  if (s.status === 'pending') {
    return (
      <>
        <button type="button" onClick={act({ status: 'active' })} className={button({ variant: 'success', size: 'sm' })}><Check size={14} /> Approve</button>
        <button type="button" onClick={act({ status: 'rejected' })} className={button({ variant: 'dangerOutline', size: 'sm' })}><X size={14} /> Reject</button>
      </>
    )
  }
  return (
    <>
      <button type="button" onClick={act({ hasCng: true })} className={button({ variant: 'success', size: 'sm' })}><Flame size={14} /> CNG on</button>
      <button type="button" onClick={act({ hasCng: false })} className={button({ size: 'sm' })}>CNG off</button>
      <button type="button" onClick={act({ status: 'closed' })} className={button({ variant: 'dangerOutline', size: 'sm' })}><Ban size={14} /> Mark closed</button>
      <button type="button" onClick={act({})} className={button({ variant: 'ghost', size: 'sm' })}>Dismiss</button>
    </>
  )
}

/** One pump in the review queue: details, map link, who added it, open driver reports, actions. */
export function FuelStationCard({ station: s, onDecide }) {
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ec-ink">{s.name}</span>
        <span className={pill()}>{s.brand}</span>
        <span className={pill({ tone: 'blue' })}>{s.source}</span>
        {s.status !== 'active' && <span className={pill({ tone: 'amber' })}>{s.status}</span>}
      </div>
      <p className="mt-1 text-sm text-ec-ink60">
        {FUELS.filter(([k]) => s[k]).map(([, l]) => l).join(' · ') || 'No fuel set'}
        {s.address ? ` — ${s.address}` : ''}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ec-ink60">
        <a href={mapUrl(s)} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-ec-blue hover:underline"><MapPin size={13} /> {s.lat.toFixed(5)}, {s.lng.toFixed(5)}</a>
        {s.addedBy && <span>added by <UserLink id={s.addedBy.id}>{s.addedBy.name ?? '—'}</UserLink></span>}
        <span>{day(s.createdAt)}</span>
      </div>
      {s.reports?.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {s.reports.map((r) => (
            <li key={`${r.user.id}-${r.kind}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className={pill({ tone: REPORT[r.kind]?.tone })}>{REPORT[r.kind]?.label ?? r.kind}</span>
              <span className="text-ec-ink60">by <UserLink id={r.user.id}>{r.user.name ?? '—'}</UserLink> · {day(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2"><Actions s={s} onDecide={onDecide} /></div>
    </div>
  )
}

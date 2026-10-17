'use client'

import { useState } from 'react'
import { Search, EyeOff, MapPin, ArrowRight, AlertTriangle } from 'lucide-react'
import { button, pill, card, input } from '@/lib/ui'
import { searchAdminCities } from '../services/unresolvedRidesApi'

/** A search-and-pick city setter for one missing endpoint of a ride. */
function CitySetter({ side, label, rawText, onSet }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])

  async function search(e) {
    e.preventDefault()
    if (!term.trim()) return
    setResults(await searchAdminCities(term.trim()))
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3">
      <div className="text-sm text-ec-ink60">
        {label} unresolved: <span className="font-mono text-ec-ink">{rawText || '— (no raw text)'}</span>
      </div>
      <form onSubmit={search} className="mt-2 flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Search city for ${label.toLowerCase()}`} className={`${input} pl-9`} />
        </div>
        <button type="submit" className={button()}>Search</button>
      </form>
      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-ec-line bg-white">
          {results.map((c) => (
            <li key={c.id} className="border-b border-ec-line last:border-0">
              <button
                type="button"
                onClick={() => onSet(side, c.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ec-ink transition hover:bg-ec-sky"
              >
                <MapPin size={14} className="text-ec-blue" />
                Set {label.toLowerCase()} → {c.canonicalName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function End({ city, raw, fallback }) {
  return city
    ? <span className="font-semibold text-ec-ink">{city.canonicalName}</span>
    : <span className={pill({ tone: 'amber' })}><AlertTriangle size={12} />{raw || fallback}</span>
}

/**
 * One live ride missing a pickup/drop city: shows the masked message, the resolved
 * side(s), and a city picker for each unresolved endpoint. Setting a city fills the
 * FK; Hide takes the ride down.
 */
export function UnresolvedRideRow({ row, onAction }) {
  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <End city={row.pickupCity} raw={row.pickupRaw} fallback="pickup ?" />
            <ArrowRight size={15} className="text-ec-blue" />
            <End city={row.dropCity} raw={row.dropRaw} fallback="drop ?" />
            {row.vehicleType && <span className={pill({ tone: 'blue' })}>{row.vehicleType}</span>}
          </div>
          <p className="mt-2 line-clamp-2 break-words text-sm text-ec-ink60">{row.displayText}</p>
        </div>
        <button type="button" onClick={() => onAction(row.id, 'hide')} className={`${button({ variant: 'dangerOutline', size: 'sm' })} shrink-0`}>
          <EyeOff size={14} /> Hide
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {!row.pickupCity && (
          <CitySetter side="pickup" label="Pickup" rawText={row.pickupRaw} onSet={(side, cityId) => onAction(row.id, 'set_city', side, cityId)} />
        )}
        {!row.dropCity && (
          <CitySetter side="drop" label="Drop" rawText={row.dropRaw} onSet={(side, cityId) => onAction(row.id, 'set_city', side, cityId)} />
        )}
      </div>
    </div>
  )
}

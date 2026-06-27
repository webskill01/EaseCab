'use client'

import { useState } from 'react'
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
    <div className="rounded-md border border-dashed p-3">
      <div className="text-sm text-ec-ink60">
        {label} unresolved: <span className="text-ec-ink">{rawText || '— (no raw text)'}</span>
      </div>
      <form onSubmit={search} className="mt-2 flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={`Search city for ${label.toLowerCase()}`}
          className="flex-1 rounded-md border px-3 py-1.5 text-sm text-ec-ink"
        />
        <button type="submit" className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">Search</button>
      </form>
      {results.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSet(side, c.id)}
                className="w-full rounded-md px-3 py-1.5 text-left text-sm text-ec-ink hover:bg-muted"
              >
                Set {label.toLowerCase()} → {c.canonicalName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * One live ride missing a pickup/drop city: shows the masked message, the resolved
 * side(s), and a city picker for each unresolved endpoint. Setting a city fills the
 * FK; Hide takes the ride down.
 */
export function UnresolvedRideRow({ row, onAction }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ec-ink">{row.displayText}</p>
          <p className="mt-1 text-xs text-ec-ink60">
            {row.pickupCity ? row.pickupCity.canonicalName : `⚠ ${row.pickupRaw || 'pickup ?'}`}
            {' → '}
            {row.dropCity ? row.dropCity.canonicalName : `⚠ ${row.dropRaw || 'drop ?'}`}
            {row.vehicleType ? ` · ${row.vehicleType}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAction(row.id, 'hide')}
          className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium text-red-600"
        >
          Hide
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

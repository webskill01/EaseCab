'use client'

import { useState } from 'react'
import { searchAdminCities } from '../services/cityStringsApi'

/**
 * One unresolved-string row: shows the raw text + how often it occurred, lets the
 * admin pick a target city (pre-filled with the resolver's fuzzy suggestion, or via
 * a typeahead) and Resolve → alias, or Dismiss → mark reviewed.
 */
export function CityStringRow({ row, onAction }) {
  const [selected, setSelected] = useState(row.suggestedCity ?? null)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])

  async function search(e) {
    e.preventDefault()
    if (!term.trim()) return
    setResults(await searchAdminCities(term.trim()))
  }

  function choose(city) {
    setSelected(city)
    setResults([])
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-ec-ink">{row.rawText}</span>
          <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-ec-ink60">seen {row.occurrenceCount}×</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!selected}
            onClick={() => onAction(row.id, 'resolve', selected?.id)}
            className="rounded-md bg-ec-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Resolve
          </button>
          <button type="button" onClick={() => onAction(row.id, 'dismiss', undefined)} className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">
            Dismiss
          </button>
        </div>
      </div>

      <div className="mt-2 text-sm text-ec-ink60">
        Maps to: <span className="text-ec-ink">{selected ? selected.canonicalName : '— pick a city —'}</span>
      </div>

      <form onSubmit={search} className="mt-2 flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search city"
          className="flex-1 rounded-md border px-3 py-1.5 text-sm text-ec-ink"
        />
        <button type="submit" className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">Search</button>
      </form>

      {results.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => choose(c)} className="w-full rounded-md px-3 py-1.5 text-left text-sm text-ec-ink hover:bg-muted">
                {c.canonicalName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

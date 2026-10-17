'use client'

import { useState } from 'react'
import { Search, Check, X, MapPin, ArrowRight } from 'lucide-react'
import { button, pill, card, input } from '@/lib/ui'
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
    <div className={card}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="break-words font-mono text-sm font-semibold text-ec-ink">{row.rawText}</span>
          <span className={pill({ tone: row.occurrenceCount >= 5 ? 'amber' : 'slate' })}>seen {row.occurrenceCount}×</span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={!selected} onClick={() => onAction(row.id, 'resolve', selected?.id)} className={button({ variant: 'primary', size: 'sm' })}>
            <Check size={14} /> Resolve
          </button>
          <button type="button" onClick={() => onAction(row.id, 'dismiss', undefined)} className={button({ size: 'sm' })}>
            <X size={14} /> Dismiss
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-ec-ink60">
        <ArrowRight size={14} className="text-ec-ink40" /> Maps to:
        <span className={selected ? pill({ tone: 'green' }) : 'italic text-ec-ink40'}>
          {selected ? <><MapPin size={12} />{selected.canonicalName}</> : '— pick a city —'}
        </span>
      </div>

      <form onSubmit={search} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search city" className={`${input} pl-9`} />
        </div>
        <button type="submit" className={button()}>Search</button>
      </form>

      {results.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-xl border border-ec-line">
          {results.map((c) => (
            <li key={c.id} className="border-b border-ec-line last:border-0">
              <button type="button" onClick={() => choose(c)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ec-ink transition hover:bg-ec-sky">
                <MapPin size={14} className="text-ec-blue" />
                {c.canonicalName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Segmented } from './Segmented'
import { button, input } from '@/lib/ui'

/**
 * Search box + labelled segmented rows for an admin list.
 * rows: [{ label, options: [{ id, label }], value, onChange }]. `onSearch` gets the trimmed term.
 */
export function ListFilters({ q, onSearch, placeholder = 'Search phone or name', rows }) {
  const [term, setTerm] = useState(q)
  const clear = () => { setTerm(''); onSearch('') }

  return (
    <div className="mb-4 space-y-3 rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card">
      <form onSubmit={(e) => { e.preventDefault(); onSearch(term.trim()) }} className="flex gap-2 sm:max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${input} pl-9`} />
        </div>
        <button type="submit" className={`${button({ variant: 'primary' })} shrink-0`}>Search</button>
      </form>
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ec-ink40">{r.label}</span>
          <div className="min-w-0"><Segmented options={r.options} value={r.value} onChange={r.onChange} /></div>
        </div>
      ))}
      {q !== '' && (
        <p className="text-xs text-ec-ink60">
          Filtered by “{q}” · <button type="button" onClick={clear} className="font-medium text-ec-blue hover:underline">clear</button>
        </p>
      )}
    </div>
  )
}

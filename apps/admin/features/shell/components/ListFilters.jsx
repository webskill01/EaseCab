'use client'

import { useEffect, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

const SEARCH_DELAY_MS = 350

/** Compact dropdown: "Label: Value ▾". */
function Pick({ label, options, value, onChange }) {
  return (
    <label className="relative inline-flex h-9 shrink-0 items-center rounded-lg border border-ec-line bg-white text-sm transition focus-within:border-ec-blue focus-within:ring-2 focus-within:ring-ec-blue/20 hover:border-ec-ink40">
      <span className="pl-3 text-ec-ink40">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-full cursor-pointer appearance-none bg-transparent pl-1.5 pr-8 font-medium text-ec-ink focus:outline-none"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-ec-ink40" />
    </label>
  )
}

/**
 * One-line list toolbar, pinned under the top of the screen while the list scrolls:
 * search (applies as you type) + a dropdown per filter/sort.
 * rows: [{ label, options: [{ id, label }], value, onChange }]. `onSearch` gets the trimmed term.
 */
export function ListFilters({ q, onSearch, placeholder = 'Search phone or name', rows }) {
  const [term, setTerm] = useState(q)

  useEffect(() => {
    const next = term.trim()
    if (next === q) return undefined
    const t = setTimeout(() => onSearch(next), SEARCH_DELAY_MS)
    return () => clearTimeout(t)
  }, [term, q, onSearch])

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-ec-line bg-ec-bg/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 md:top-0 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(term.trim()) }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-9 w-full rounded-lg border border-ec-line bg-white pl-9 pr-8 text-sm text-ec-ink placeholder:text-ec-ink40 transition focus:border-ec-blue focus:outline-none focus:ring-2 focus:ring-ec-blue/20"
          />
          {term && (
            <button type="button" onClick={() => { setTerm(''); onSearch('') }} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ec-ink40 hover:text-ec-ink">
              <X size={14} />
            </button>
          )}
        </div>
        {/* ponytail: one swipeable row on phones instead of stacking a line per dropdown */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {rows.map((r) => <Pick key={r.label} {...r} />)}
        </div>
      </div>
    </div>
  )
}

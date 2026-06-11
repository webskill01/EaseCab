'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pin, Search, Check, ChevR } from '@/components/ui/icons'
import { searchCities } from '../services/citiesApi'

const DEBOUNCE_MS = 250

/**
 * City typeahead form field (SCREENS §5 Route section). Same `/cities` debounced
 * typeahead as the feed CityFilter, but as a single-value picker: choosing a result
 * calls `onPick({ id, name })`. The selected city shows in the trigger; tapping it
 * reopens the search.
 *
 * @param {object} props
 * @param {string} props.label - field label (already translated)
 * @param {?{id: ?string, name: string}} props.value - the picked city, or null
 * @param {(city: {id: string, name: string}) => void} props.onPick
 */
export function CityPicker({ label, value, onPick }) {
  const t = useTranslations('post')
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])

  // Debounced typeahead with abort-on-keystroke (≥2 chars; backend floors the rest).
  useEffect(() => {
    if (!open || q.trim().length < 2) { setResults([]); return undefined }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try {
        setResults(await searchCities(q.trim(), { limit: 10, signal: ctrl.signal }))
      } catch {
        // aborted or transient — keep prior results, never throw to the UI
      }
    }, DEBOUNCE_MS)
    return () => { clearTimeout(id); ctrl.abort() }
  }, [q, open])

  const choose = (city) => { onPick(city); setOpen(false); setQ('') }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex h-12 w-full items-center gap-2 rounded-xl border-[1.5px] border-ec-line bg-white px-3 text-[14px] font-bold shadow-ec-card"
      >
        <span className="inline-flex text-ec-blue"><Pin size={17} /></span>
        <span className={`min-w-0 flex-1 truncate text-left ${value ? 'text-ec-blueInk' : 'text-ec-ink40'}`}>
          {value ? value.name : label}
        </span>
        <span className={`inline-flex text-ec-ink40 transition-transform ${open ? 'rotate-180' : ''}`}><ChevR size={15} /></span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 right-0 top-[108%] z-50 rounded-2xl border border-ec-line bg-white p-1.5 shadow-ec-float" role="listbox">
            <div className="my-1 flex h-11 items-center gap-2.5 rounded-xl border border-ec-line px-3">
              <span className="inline-flex text-ec-ink40"><Search size={16} /></span>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('post.searchCity')}
                aria-label={t('post.searchCity')}
                className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ec-ink outline-none placeholder:text-ec-ink40"
              />
            </div>

            {results.map((c) => {
              const on = value?.id === c.id
              return (
                <button key={c.id} type="button" onClick={() => choose({ id: c.id, name: c.canonicalName })} className={ddItem(on)}>
                  <span className={`inline-flex ${on ? 'text-ec-blue' : 'text-ec-ink40'}`}><Pin size={15} /></span>
                  <span className="flex-1 text-left">{c.canonicalName}</span>
                  {on && <span className="inline-flex text-ec-blue"><Check size={15} /></span>}
                </button>
              )
            })}
            {q.trim().length >= 2 && results.length === 0 && (
              <div className="px-2.5 py-3 text-center text-[13px] font-medium text-ec-ink40">{t('post.noResults')}</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const ddItem = (on) =>
  `flex h-11 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-[14.5px] ${on ? 'bg-ec-sky font-extrabold text-ec-blue' : 'bg-transparent font-semibold text-ec-ink'}`

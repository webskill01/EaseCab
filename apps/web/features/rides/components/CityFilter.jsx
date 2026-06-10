'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pin, Steer, Search, Check, ChevR } from '@/components/ui/icons'
import { searchCities } from '../services/citiesApi'

const DEBOUNCE_MS = 250

/**
 * Live city-filter lock control (chrome.jsx FeedControls filter dropdown, scoped to
 * the dropdown + `/cities` typeahead — the full A–Z overlay is deferred). Picking a
 * city locks the feed to it; "All cities" clears the lock.
 *
 * @param {{ locked: ?{id: string, name: string}, onPick: (city: ?{id,name}) => void }} props
 */
export function CityFilter({ locked, onPick }) {
  const t = useTranslations('rides')
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const filtered = Boolean(locked)

  // Debounced typeahead with abort-on-keystroke (≥2 chars; backend floors the rest).
  useEffect(() => {
    if (!open || q.trim().length < 2) { setResults([]); return undefined }
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try {
        setResults(await searchCities(q.trim(), { limit: 10, signal: ctrl.signal }))
      } catch {
        // aborted or transient — leave the prior results, never throw to the UI
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
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold ${
          filtered ? 'bg-ec-blue text-white shadow-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-blueInk shadow-ec-card'
        }`}
      >
        <span className={`inline-flex ${filtered ? 'text-white' : 'text-ec-blue'}`}><Pin size={17} /></span>
        <span className="min-w-0 flex-1 truncate text-left">{filtered ? locked.name : t('filter.filterByCity')}</span>
        <span className={`inline-flex transition-transform ${open ? 'rotate-180' : ''} ${filtered ? 'text-white' : 'text-ec-ink40'}`}><ChevR size={15} /></span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 right-0 top-[108%] z-50 rounded-2xl border border-ec-line bg-white p-1.5 shadow-ec-float" role="listbox">
            <button type="button" onClick={() => choose(null)} className={ddItem(!filtered)}>
              <span className={`inline-flex ${!filtered ? 'text-ec-blue' : 'text-ec-ink40'}`}><Steer size={16} /></span>
              <span className="flex-1 text-left">{t('filter.allCities')}</span>
              {!filtered && <span className="inline-flex text-ec-blue"><Check size={15} /></span>}
            </button>

            <div className="my-1.5 flex h-11 items-center gap-2.5 rounded-xl border border-ec-line px-3">
              <span className="inline-flex text-ec-ink40"><Search size={16} /></span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('filter.searchCity')}
                aria-label={t('filter.searchCity')}
                className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ec-ink outline-none placeholder:text-ec-ink40"
              />
            </div>

            {results.map((c) => {
              const on = locked?.id === c.id
              return (
                <button key={c.id} type="button" onClick={() => choose({ id: c.id, name: c.canonicalName })} className={ddItem(on)}>
                  <span className={`inline-flex ${on ? 'text-ec-blue' : 'text-ec-ink40'}`}><Pin size={15} /></span>
                  <span className="flex-1 text-left">{c.canonicalName}</span>
                  {on && <span className="inline-flex text-ec-blue"><Check size={15} /></span>}
                </button>
              )
            })}
            {q.trim().length >= 2 && results.length === 0 && (
              <div className="px-2.5 py-3 text-center text-[13px] font-medium text-ec-ink40">{t('filter.noResults')}</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const ddItem = (on) =>
  `flex h-11 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-[14.5px] ${on ? 'bg-ec-sky font-extrabold text-ec-blue' : 'bg-transparent font-semibold text-ec-ink'}`

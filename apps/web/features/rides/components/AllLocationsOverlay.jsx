'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { Overlay, OverlayHeader } from '@/components/ui/Overlay'
import { Search, Steer, Check } from '@/components/ui/icons'
import { allCities } from '../services/citiesApi'
import { useNearestCity } from '@/features/notifications/hooks/useNearestCity'
import { LOCATION_CHIPS, cityToView, filterCities, groupCitiesByLetter } from '../lib/allLocations'

/**
 * "All Locations" overlay (design-spec §7.4): search field, pastel quick-pick chip
 * grid, then an A–Z grouped city list. Multi-select — tapping a city toggles it in/out
 * of the lock (overlay stays open, checkmarks track the set); "All cities" clears the
 * whole lock. Replaces the inline CityFilter dropdown (#6).
 *
 * @param {{
 *   selected: {id:string,name:string}[],
 *   onClose: () => void,
 *   onToggle: (city: {id:string,name:string}) => void,
 *   onClear: () => void,
 * }} props
 */
export function AllLocationsOverlay({ selected, onClose, onToggle, onClear }) {
  const t = useTranslations('rides')
  const tc = useTranslations('common')
  const locale = useLocale()
  const [q, setQ] = useState('')
  const nearest = useNearestCity()

  const { data: cities = [], isLoading } = useQuery({ queryKey: ['allCities'], queryFn: allCities, staleTime: 300000 })

  const byName = useMemo(() => {
    const m = new Map()
    for (const c of cities) m.set(c.canonicalName.toLowerCase(), c)
    return m
  }, [cities])

  const groups = useMemo(() => groupCitiesByLetter(filterCities(cities, q, locale), locale), [cities, q, locale])
  const searching = q.trim().length > 0
  const none = selected.length === 0
  const isOn = (id) => selected.some((c) => c.id === id)
  const toggle = (city) => onToggle(city) // stays open for multi-select

  const useMyLocation = async () => {
    const city = await nearest.locate()
    if (city && !isOn(city.id)) toggle({ id: city.id, name: city.canonicalName })
  }

  return (
    <Overlay onClose={onClose} label={t('filter.allLocations')}>
      <OverlayHeader title={t('filter.allLocations')} onBack={onClose} backLabel={tc('actions.back')} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex h-12 items-center gap-2.5 rounded-xl border border-ec-line bg-white px-3.5">
          <span className="inline-flex text-ec-ink40"><Search size={18} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('filter.searchCity')}
            aria-label={t('filter.searchCity')}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ec-ink outline-none placeholder:text-ec-ink40"
          />
        </div>

        {!searching && (
          <>
            <button
              type="button"
              onClick={onClear}
              className={`mt-3 flex h-12 w-full items-center gap-2.5 rounded-xl px-3.5 text-[14.5px] ${none ? 'bg-ec-sky font-extrabold text-ec-blue' : 'border border-ec-line bg-white font-semibold text-ec-ink'}`}
            >
              <span className={`inline-flex ${none ? 'text-ec-blue' : 'text-ec-ink40'}`}><Steer size={16} /></span>
              <span className="flex-1 text-left">{t('filter.allCities')}</span>
              {none && <span className="inline-flex text-ec-blue"><Check size={15} /></span>}
            </button>

            <p className="mb-2.5 mt-4 text-[12.5px] font-bold text-ec-ink60">{t('filter.quickPick')}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {LOCATION_CHIPS.map((ch) => {
                if (ch.geo) {
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={useMyLocation}
                      disabled={nearest.isLocating}
                      style={{ background: ch.bg, color: ch.fg }}
                      className="flex h-[46px] items-center justify-center rounded-xl text-[13.5px] font-extrabold uppercase tracking-wide disabled:opacity-60"
                    >
                      {t('filter.myLocation')}
                    </button>
                  )
                }
                const city = byName.get(ch.key.toLowerCase())
                if (!city) return null
                const view = cityToView(city, locale)
                const on = isOn(view.id)
                return (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => toggle(view)}
                    style={{ background: ch.bg, color: ch.fg }}
                    className={`flex h-[46px] items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-extrabold uppercase tracking-wide ${on ? 'ring-2 ring-ec-blue ring-offset-1' : ''}`}
                  >
                    {on && <span className="inline-flex"><Check size={14} /></span>}
                    {view.name}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-5">
          {isLoading ? (
            <p className="text-center text-[13px] font-medium text-ec-ink40">…</p>
          ) : groups.length === 0 ? (
            <p className="px-2.5 py-3 text-center text-[13px] font-medium text-ec-ink40">{t('filter.noResults')}</p>
          ) : (
            groups.map((g) => (
              <div key={g.letter} className="mb-4">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-ec-sky text-[18px] font-extrabold text-ec-blueInk">{g.letter}</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {g.cities.map((c) => {
                    const on = isOn(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(c)}
                        aria-pressed={on}
                        className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13.5px] font-bold ${on ? 'bg-ec-sky text-ec-blue ring-2 ring-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-ink'}`}
                      >
                        {on && <span className="inline-flex"><Check size={14} /></span>}
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Overlay>
  )
}

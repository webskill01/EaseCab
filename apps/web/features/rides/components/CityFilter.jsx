'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pin, ChevR, Plus } from '@/components/ui/icons'
import { AllLocationsOverlay } from './AllLocationsOverlay'

/**
 * City-filter trigger (chrome.jsx FeedControls). Opens the full "All Locations"
 * overlay (design-spec §7.4) — search + pastel quick-picks + A–Z list. Multi-select:
 * tapping cities in the overlay toggles them; the trigger shows the single name or an
 * "N cities" count, and a ✕ chip clears the whole lock back to All rides.
 *
 * @param {{
 *   selected: {id: string, name: string}[],
 *   onToggle: (city: {id: string, name: string}) => void,
 *   onClear: () => void,
 * }} props
 */
export function CityFilter({ selected, onToggle, onClear }) {
  const t = useTranslations('rides')
  const [open, setOpen] = useState(false)
  const count = selected.length
  const filtered = count > 0
  const label = count === 0 ? t('filter.filterByCity') : count === 1 ? selected[0].name : t('filter.citiesSelected', { count })

  return (
    <>
      <div className="flex w-full items-stretch gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-bold ${
            filtered ? 'bg-ec-blue text-white shadow-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-blueInk shadow-ec-card'
          }`}
        >
          <span className={`inline-flex ${filtered ? 'text-white' : 'text-ec-blue'}`}><Pin size={17} /></span>
          <span className="min-w-0 truncate text-center">{label}</span>
          <span className={`inline-flex ${filtered ? 'text-white' : 'text-ec-ink40'}`}><ChevR size={15} /></span>
        </button>

        {filtered && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('filter.clear')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-ec-line bg-white text-ec-ink60 shadow-ec-card"
          >
            {/* No close glyph in the icon set — a 45°-rotated plus reads as ✕. */}
            <span className="inline-flex rotate-45"><Plus size={20} /></span>
          </button>
        )}
      </div>

      {open && (
        <AllLocationsOverlay
          selected={selected}
          onClose={() => setOpen(false)}
          onToggle={onToggle}
          onClear={onClear}
        />
      )}
    </>
  )
}

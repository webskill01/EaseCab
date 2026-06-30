'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pin, ChevR } from '@/components/ui/icons'
import { AllLocationsOverlay } from './AllLocationsOverlay'

/**
 * City-filter trigger (chrome.jsx FeedControls). Opens the full "All Locations"
 * overlay (design-spec §7.4) — search + pastel quick-picks + A–Z list. Multi-select:
 * tapping cities in the overlay toggles them; the trigger shows the single name or an
 * "N cities" count. Clearing the lock (back to All rides) lives INSIDE the overlay via
 * its "All cities" reset — the feed page stays a single, uncluttered trigger.
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold ${
          filtered ? 'bg-ec-blue text-white shadow-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-blueInk shadow-ec-card'
        }`}
      >
        <span className={`inline-flex ${filtered ? 'text-white' : 'text-ec-blue'}`}><Pin size={17} /></span>
        <span className="min-w-0 truncate text-center">{label}</span>
        <span className={`inline-flex ${filtered ? 'text-white' : 'text-ec-ink40'}`}><ChevR size={15} /></span>
      </button>

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

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pin, ChevR } from '@/components/ui/icons'
import { AllLocationsOverlay } from './AllLocationsOverlay'

/**
 * City-filter trigger (chrome.jsx FeedControls). Opens the full "All Locations"
 * overlay (design-spec §7.4) — search + pastel quick-picks + A–Z list. Picking a
 * city locks the feed to it; "All cities" inside the overlay clears the lock.
 *
 * @param {{ locked: ?{id: string, name: string}, onPick: (city: ?{id,name}) => void }} props
 */
export function CityFilter({ locked, onPick }) {
  const t = useTranslations('rides')
  const [open, setOpen] = useState(false)
  const filtered = Boolean(locked)

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
        <span className="min-w-0 truncate text-center">{filtered ? locked.name : t('filter.filterByCity')}</span>
        <span className={`inline-flex ${filtered ? 'text-white' : 'text-ec-ink40'}`}><ChevR size={15} /></span>
      </button>

      {open && (
        <AllLocationsOverlay locked={locked} onClose={() => setOpen(false)} onPick={onPick} />
      )}
    </>
  )
}

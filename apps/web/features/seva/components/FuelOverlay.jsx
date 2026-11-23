'use client'

import { useTranslations } from 'next-intl'
import { FUEL_TYPES } from '@easecab/shared'
import { ChevronLeft, GasStation } from '@/components/ui/icons'
import { MAP_COLORS } from '../lib/mapIcons'

export const MODES = Object.freeze({ NEAR: 'near', CITY: 'city', ROUTE: 'route' })
const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue focus-visible:ring-offset-2'

/** Near me | City | On my route, with a pill that slides under the active one. */
function ModeSwitch({ mode, onPick }) {
  const t = useTranslations('seva.fuel.mode')
  const at = Object.values(MODES).indexOf(mode)
  return (
    <div className="relative grid h-11 min-w-0 flex-1 grid-cols-3 rounded-ec-chip bg-white p-1 shadow-ec-float">
      <span aria-hidden="true" style={{ transform: `translateX(${at * 100}%)` }} className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-ec-chip bg-ec-blueInk transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none" />
      {Object.values(MODES).map((m) => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => onPick(m)}
          className={`relative min-w-0 truncate rounded-ec-chip px-1 text-[13px] font-extrabold transition-colors duration-200 ${RING} ${mode === m ? 'text-white' : 'text-ec-ink60'}`}>
          {t(m)}
        </button>
      ))}
    </div>
  )
}

/** CNG / Petrol / Diesel pills, each with a pump icon in its map-pin colour. */
function FuelChips({ fuel, onPick }) {
  const t = useTranslations('seva.fuel')
  return (
    <div className="flex gap-2" role="tablist">
      {Object.values(FUEL_TYPES).map((f) => {
        const on = fuel === f
        return (
          <button key={f} type="button" role="tab" aria-selected={on} onClick={() => onPick(f)}
            className={`flex h-9 items-center gap-1.5 rounded-ec-chip px-3.5 text-[13.5px] font-extrabold shadow-ec-float transition-[background-color,color,transform] duration-200 active:scale-95 ${RING} ${on ? 'bg-ec-blue text-white' : 'bg-white text-ec-ink'}`}>
            <span aria-hidden="true" style={on ? undefined : { color: MAP_COLORS[f] }}><GasStation size={17} /></span>
            {t(`types.${f}`)}
          </button>
        )
      })}
    </div>
  )
}

/** Floating controls over the map: back, mode switch, fuel chips. */
export function FuelOverlay({ mode, onMode, fuel, onFuel, onBack }) {
  const t = useTranslations('seva.fuel')
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 space-y-2.5 px-3 pt-3 [&>*]:pointer-events-auto">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t('back')}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ec-ink shadow-ec-float active:bg-ec-bg ${RING}`}>
          <ChevronLeft size={24} />
        </button>
        <ModeSwitch mode={mode} onPick={onMode} />
      </div>
      <h1 className="sr-only">{t('title')}</h1>
      <FuelChips fuel={fuel} onPick={onFuel} />
    </div>
  )
}

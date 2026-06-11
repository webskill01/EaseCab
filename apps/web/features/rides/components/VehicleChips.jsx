'use client'

import { VehicleIcon } from '@/components/ui/icons'
import { POST_VEHICLES } from '../lib/postForm'
import { vehIconKey } from '../lib/rideView'

/**
 * Vehicle-type chooser (SCREENS §5) — single-select chips over the canonical
 * vehicle labels. Pure presentational; parent owns the value.
 * @param {{ value: string, onChange: (v: string) => void }} props
 */
export function VehicleChips({ value, onChange }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {POST_VEHICLES.map((v) => {
        const on = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-bold ${
              on ? 'bg-ec-blue text-white shadow-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-blueInk'
            }`}
          >
            <VehicleIcon vehicleKey={vehIconKey(v)} size={16} />
            {v}
          </button>
        )
      })}
    </div>
  )
}

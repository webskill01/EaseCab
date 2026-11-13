'use client'

import { useStateSwitches } from '../hooks/useBorderTax'
import { button } from '@/lib/ui'

/** One button per live state: tap to switch new filings off/on. Filings already running finish either way. */
export function StateSwitches() {
  const { states, toggle } = useStateSwitches()
  if (!states.length) return null
  return (
    <section className="mb-4 rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card">
      <p className="text-sm font-semibold text-ec-ink">States open to drivers</p>
      <p className="mt-0.5 text-xs text-ec-ink60">Switch a state off when its portal is down. Drivers stop seeing it; filings already running still finish.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {states.map((s) => (
          <button
            key={s.stateCd}
            type="button"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ stateCd: s.stateCd, paused: !s.paused })}
            className={button({ variant: s.paused ? 'dangerOutline' : 'success', size: 'sm' })}
            aria-pressed={!s.paused}
          >
            {s.name}: {s.paused ? 'Off' : 'On'}
          </button>
        ))}
      </div>
    </section>
  )
}

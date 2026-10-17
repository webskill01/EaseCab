'use client'

import { useState } from 'react'

/**
 * Dependency-free vertical bar chart. `data` = [{ label, value }] oldest → newest.
 * Hover / tap a bar to read its value.
 * ponytail: CSS bars, swap for a chart lib if axes/multi-series are ever needed.
 */
export function BarChart({ data, format = String, color = 'bg-ec-blue' }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const shown = hover ?? data.length - 1

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between text-sm">
        <span className="text-ec-ink60">{data[shown]?.label}</span>
        <span className="text-lg font-bold text-ec-ink">{data[shown] ? format(data[shown].value) : '—'}</span>
      </div>
      <div className="flex h-40 items-end gap-1" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <button
            key={d.label}
            type="button"
            aria-label={`${d.label}: ${format(d.value)}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
            className="group flex h-full flex-1 items-end"
          >
            <span
              className={`w-full rounded-t-md transition-all duration-500 ${color} ${i === shown ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`}
              style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

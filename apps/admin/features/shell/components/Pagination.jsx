'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Page numbers to show: first, last, current ±1, with '…' gaps. */
export function pageWindow(page, pages) {
  const keep = new Set([1, pages, page - 1, page, page + 1])
  const out = []
  for (let p = 1; p <= pages; p++) {
    if (!keep.has(p)) continue
    if (out.length && p - out[out.length - 1] > 1) out.push('…')
    out.push(p)
  }
  return out
}

const NAV = 'flex h-9 min-w-9 items-center justify-center rounded-lg border border-ec-line bg-white px-2 text-sm text-ec-ink transition hover:border-ec-blue/40 hover:bg-ec-sky disabled:pointer-events-none disabled:opacity-40'

/** "Showing 21–40 of 134" + prev / numbered / next. Hidden when everything fits one page. */
export function Pagination({ page, total, limit = 20, onChange }) {
  if (total <= limit) return null
  const pages = Math.ceil(total / limit)
  const go = (p) => {
    onChange(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-ec-ink60">
        Showing <span className="font-semibold text-ec-ink">{from}–{to}</span> of <span className="font-semibold text-ec-ink">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)} className={NAV}>
          <ChevronLeft size={16} />
        </button>
        {pageWindow(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-ec-ink40">…</span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => go(p)}
              className={cn(NAV, p === page && 'border-ec-blue bg-ec-blue text-white hover:bg-ec-blueDeep')}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => go(page + 1)} className={NAV}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

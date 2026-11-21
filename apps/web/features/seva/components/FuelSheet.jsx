'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

export const SNAPS = Object.freeze({ PEEK: 'peek', HALF: 'half', FULL: 'full' })
export const PEEK_PX = 260 // visible sheet height at peek; the map fits its pins above this
export const TOP_PX = 132 // sheet stops under the floating header at full
const HALF_RATIO = 0.48
const TAP_PX = 6
const FLING_MS = 180 // how far a release velocity is projected when picking the snap
const NEXT = Object.freeze({ peek: SNAPS.HALF, half: SNAPS.FULL, full: SNAPS.HALF })

/** translateY of the sheet top for each snap, inside a container `h` px tall. */
const offsets = (h) => ({ peek: Math.max(TOP_PX, h - PEEK_PX), half: Math.max(TOP_PX, Math.round(h * (1 - HALF_RATIO))), full: TOP_PX })

/** Height of the element's parent, kept fresh on resize / rotate. */
function useParentHeight(ref) {
  const [h, setH] = useState(0)
  useEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height))
    ro.observe(parent)
    return () => ro.disconnect()
  }, [ref])
  return h
}

/** Pointer drag on the grip: follows the finger 1:1, then settles on the snap the fling points at. */
function useDrag(set, offs, snap, onSnap) {
  const d = useRef(null)
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    d.current = { y0: e.clientY, from: offs[snap], y: offs[snap], v: 0, t: e.timeStamp }
  }
  const move = (e) => {
    const s = d.current
    if (!s) return
    const y = Math.min(offs.peek, Math.max(offs.full, s.from + e.clientY - s.y0))
    s.v = (y - s.y) / Math.max(1, e.timeStamp - s.t)
    Object.assign(s, { y, t: e.timeStamp })
    set(y, false)
  }
  const up = (e) => {
    const s = d.current
    d.current = null
    if (!s) return
    if (Math.abs(e.clientY - s.y0) < TAP_PX) return onSnap(NEXT[snap])
    const aim = s.y + s.v * FLING_MS
    const target = Object.values(SNAPS).reduce((a, b) => (Math.abs(offs[b] - aim) < Math.abs(offs[a] - aim) ? b : a))
    set(offs[target], true) // React may not re-render when the snap is unchanged
    onSnap(target)
  }
  return { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up }
}

/**
 * Google-Maps-style bottom sheet over the map: peek / half / full, dragged by its grip
 * (tap the grip to step up). `header` stays pinned under the grip; `aside` floats above
 * the sheet's top edge (the locate button) and rides along with it.
 */
export function FuelSheet({ snap, onSnap, header, aside, children }) {
  const t = useTranslations('seva.fuel.sheet')
  const el = useRef(null)
  const h = useParentHeight(el)
  const offs = offsets(h)
  const paint = (y, animate) => {
    el.current.style.transition = animate ? '' : 'none'
    el.current.style.transform = `translateY(${y}px)`
  }
  const drag = useDrag(paint, offs, snap, onSnap)
  return (
    <section ref={el} aria-label={t('label')}
      className="absolute inset-x-0 top-0 z-10 flex h-full flex-col rounded-t-[24px] bg-white shadow-[0_-6px_24px_rgba(15,23,42,0.14)] transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none"
      style={{ transform: `translateY(${offs[snap]}px)` }}>
      {aside && snap !== SNAPS.FULL && <div className="absolute -top-14 right-3">{aside}</div>}
      <div {...drag} className="shrink-0 touch-none select-none px-4 pb-2">
        <button type="button" onClick={(e) => e.preventDefault()} aria-label={t(snap === SNAPS.FULL ? 'collapse' : 'expand')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSnap(NEXT[snap]))}
          className="mx-auto flex h-6 w-16 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue">
          <span className="h-1.5 w-10 rounded-full bg-ec-line" />
        </button>
        {header}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4" style={{ paddingBottom: offs[snap] + 24 }}>
        {children}
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10
const EDGE_PX = 28
const SWIPE_BACK_PX = 90

/** Long-press (touch or mouse) → onLong; a drag/scroll or early release cancels it. */
export function useLongPress(onLong) {
  const timer = useRef(null)
  const start = useRef(null)
  const cancel = () => { clearTimeout(timer.current); start.current = null }
  return {
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => { start.current = null; onLong() }, LONG_PRESS_MS)
    },
    onPointerMove: (e) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_CANCEL_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e) => e.preventDefault(), // no browser menu on hold — ours opens instead
  }
}

const LEAVE_MS = 170 // leave as the 0.18s slide-out finishes

/**
 * Swipe right from the left edge → onBack; the page follows the finger, snaps back if short.
 * `leave()` (also used by the Back button) slides the page out first, so leaving is never a snap.
 * @returns {{ bind: object, leave: () => void }}
 */
export function useSwipeBack(onBack) {
  const ref = useRef(null)
  const start = useRef(null)
  const leave = () => {
    const el = ref.current
    if (!el) { onBack(); return }
    el.style.transition = 'transform 0.18s ease-in, opacity 0.18s ease-in'
    el.style.transform = 'translateX(40%)'
    el.style.opacity = '0'
    setTimeout(onBack, LEAVE_MS)
  }
  const move = (x) => {
    const el = ref.current
    if (!el) return
    el.style.transition = x ? 'none' : 'transform 0.2s ease'
    el.style.transform = x ? `translateX(${x}px)` : ''
  }
  const bind = {
    ref,
    onTouchStart: (e) => {
      const t = e.touches[0]
      start.current = t.clientX < EDGE_PX ? { x: t.clientX, y: t.clientY } : null
    },
    onTouchMove: (e) => {
      if (!start.current) return
      const t = e.touches[0]
      const dx = t.clientX - start.current.x
      if (Math.abs(t.clientY - start.current.y) > Math.max(30, dx)) { start.current = null; move(0); return } // a scroll
      move(Math.max(0, dx))
    },
    onTouchEnd: (e) => {
      if (!start.current) return
      const dx = e.changedTouches[0].clientX - start.current.x
      start.current = null
      if (dx > SWIPE_BACK_PX) leave()
      else move(0)
    },
  }
  return { bind, leave }
}

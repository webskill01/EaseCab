'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Bottom-sheet host (appshell.jsx SheetHost) — the soft-gate surface (§ soft gate).
 * Scrim + slide-up panel with a grabber; closes on backdrop click or Escape.
 *
 * Close is animated: a close request plays the scrim-fade + panel slide-down, then
 * fires the caller's `onClose` (which unmounts) on animation end — so dismissing a
 * sheet mirrors the slide-in instead of snapping away. The caller still controls mount
 * via conditional rendering.
 *
 * @param {{ onClose: () => void, label?: string, children: React.ReactNode }} props
 */
export function BottomSheet({ onClose, label, children }) {
  const [closing, setClosing] = useState(false)
  // Animate the exit, then unmount on animationend. When motion is reduced the panel
  // has no exit animation (so animationend never fires) — close immediately instead.
  const requestClose = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setClosing(true)
  }, [onClose])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [requestClose])

  // The panel runs one animation on enter and one on exit; only the exit should unmount.
  const onPanelAnimEnd = () => { if (closing) onClose() }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-ec-ink/45 motion-reduce:animate-none ${closing ? 'animate-ec-scrim-out' : 'animate-ec-scrim-in'}`}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onAnimationEnd={onPanelAnimEnd}
        className={`relative max-h-[88%] overflow-y-auto rounded-t-[22px] bg-white px-[18px] pb-5 pt-2.5 shadow-[0_-10px_40px_rgba(15,23,42,0.2)] motion-reduce:animate-none ${closing ? 'animate-ec-sheet-down' : 'animate-ec-sheet-up'}`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-[3px] bg-ec-line" />
        {children}
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'

/**
 * Bottom-sheet host (appshell.jsx SheetHost) — the soft-gate surface (§ soft gate).
 * Scrim + slide-up panel with a grabber; closes on backdrop click or Escape. The
 * caller controls mount via conditional rendering.
 *
 * @param {{ onClose: () => void, label?: string, children: React.ReactNode }} props
 */
export function BottomSheet({ onClose, label, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-ec-ink/45" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={label} className="relative max-h-[88%] overflow-y-auto rounded-t-[22px] bg-white px-[18px] pb-5 pt-2.5 shadow-[0_-10px_40px_rgba(15,23,42,0.2)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-[3px] bg-ec-line" />
        {children}
      </div>
    </div>
  )
}

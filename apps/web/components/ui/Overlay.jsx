'use client'

import { useEffect, useRef } from 'react'
import { ChevL } from '@/components/ui/icons'

/**
 * Full-cover overlay screen (design-spec §6.12): absolute full-cover over the app
 * shell, `bg` background, slide-in from the right. Closes on Escape. The caller
 * controls mount via conditional rendering (mirrors BottomSheet). Compose with
 * `OverlayHeader` for the back chevron + title, and an optional sticky footer.
 *
 * @param {{ onClose: () => void, label?: string, children: React.ReactNode }} props
 */
export function Overlay({ onClose, label, children }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Trap the hardware/browser Back button: the overlay is client state, not a route,
  // so without a history entry Back would pop the app's own history and EXIT (TWA).
  // Push one entry on open; Back fires popstate → close. If we instead close via the
  // chevron/Escape, consume the entry we added so Back stays consistent.
  useEffect(() => {
    window.history.pushState({ __ecOverlay: true }, '')
    const onPop = () => onCloseRef.current()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (window.history.state && window.history.state.__ecOverlay) window.history.back()
    }
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 flex flex-col bg-ec-bg animate-ec-slide-in">
      {children}
    </div>
  )
}

/**
 * Overlay header (design-spec §6.12): white bar, back chevron + title (18/800),
 * bottom border, optional right-aligned slot.
 *
 * @param {{ title: string, onBack: () => void, backLabel: string, right?: React.ReactNode }} props
 */
export function OverlayHeader({ title, onBack, backLabel, right }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-ec-line bg-white px-3.5 py-3">
      <button type="button" onClick={onBack} aria-label={backLabel} className="flex h-9 w-9 items-center justify-center rounded-lg text-ec-ink">
        <ChevL size={24} />
      </button>
      <div className="min-w-0 flex-1 truncate text-[18px] font-extrabold tracking-tight text-ec-ink">{title}</div>
      {right}
    </div>
  )
}

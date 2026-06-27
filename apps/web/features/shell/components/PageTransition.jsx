'use client'

import { usePathname } from 'next/navigation'

/** Bottom-nav destinations — independent top-level tabs, NOT a drill-down. Switching
 * between them is a direct redirect, so it gets no entrance animation. */
const TOP_LEVEL = new Set(['/feed', '/mine', '/post', '/profile', '/messages'])

/**
 * Drill-down page entrance: sub-pages opened from a tab (verify, notifications, edit,
 * language, blocked, membership, u/[id], …) get a subtle fade+rise, keyed on pathname so
 * it replays per navigation. Top-level tab switches are left instant (see TOP_LEVEL).
 */
export function PageTransition({ children }) {
  const pathname = usePathname()
  const animate = !TOP_LEVEL.has(pathname)
  return (
    <div key={pathname} className={`flex min-h-0 flex-1 flex-col ${animate ? 'animate-ec-page-rise' : ''}`}>
      {children}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { initials } from '@/lib/ui'

// Stable colour per name so the same person keeps the same bubble.
const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600', 'bg-indigo-500']

/**
 * Profile photo, or an initials bubble when there is no photo (or it fails to load).
 * A photo opens full size in a new tab; the bubble alone is decorative (name is always beside it).
 */
export function Avatar({ name, src, size = 'h-10 w-10 text-sm' }) {
  const [broken, setBroken] = useState(false)
  const n = name ?? ''
  const color = COLORS[[...n].reduce((t, c) => t + c.charCodeAt(0), 0) % COLORS.length]
  const cls = `relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-white ${size} ${color}`
  if (!src || broken) return <span aria-hidden="true" className={cls}>{initials(name)}</span>
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" title="Open photo" aria-label={`Open ${n || 'user'}'s photo`} className={`${cls} transition hover:ring-ec-blue/40`}>
      {initials(name)}
      {/* ponytail: unoptimized — presigned R2 URLs expire, nothing to cache/optimise. */}
      <Image src={src} alt="" fill sizes="96px" unoptimized className="object-cover" onError={() => setBroken(true)} />
    </a>
  )
}

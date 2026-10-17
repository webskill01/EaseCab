'use client'

import { useState } from 'react'
import Image from 'next/image'
import { initials } from '@/lib/ui'

// Stable colour per name so the same person keeps the same bubble.
const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-600', 'bg-indigo-500']

/**
 * Profile photo, or an initials bubble when there is no photo (or it fails to load).
 * Decorative — the name is always rendered next to it.
 */
export function Avatar({ name, src, size = 'h-10 w-10 text-sm' }) {
  const [broken, setBroken] = useState(false)
  const n = name ?? ''
  const color = COLORS[[...n].reduce((t, c) => t + c.charCodeAt(0), 0) % COLORS.length]
  return (
    <span aria-hidden="true" className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-white ${size} ${color}`}>
      {initials(name)}
      {/* ponytail: unoptimized — presigned R2 URLs expire, nothing to cache/optimise. */}
      {src && !broken && <Image src={src} alt="" fill sizes="96px" unoptimized className="object-cover" onError={() => setBroken(true)} />}
    </span>
  )
}

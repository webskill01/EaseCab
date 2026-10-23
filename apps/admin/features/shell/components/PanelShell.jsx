'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar, Brand } from './Sidebar'
import { Toaster } from './Toaster'

/** Panel frame: sidebar (drawer on phones) + sticky mobile top bar + toasts. */
export function PanelShell({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-ec-bg md:flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ec-line bg-white/95 px-4 backdrop-blur md:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-ec-ink60 hover:bg-ec-bg">
            <Menu size={20} />
          </button>
          <Brand />
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}

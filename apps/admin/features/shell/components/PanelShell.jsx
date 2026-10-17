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
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-slate-900 px-4 py-3 shadow-md md:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-slate-200 hover:bg-white/10">
            <Menu size={20} />
          </button>
          <Brand />
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}

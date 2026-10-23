'use client'

import { useSyncExternalStore } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { subscribe, getToasts, dismissToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const EMPTY = []

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts, () => EMPTY)
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-ec-float animate-in fade-in slide-in-from-bottom-4',
            t.tone === 'error' ? 'bg-ec-danger' : 'bg-emerald-600',
          )}
        >
          {t.tone === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { button } from '@/lib/ui'
import { formatPhone } from '@/features/shell/components/PhoneLink'

export function RejectDialog({ item, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-ec-float animate-in slide-in-from-bottom-8 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-ec-ink">
          Reject {item.docType.toUpperCase()} — {item.user.name ?? formatPhone(item.user.phone)}
        </h2>
        <p className="mt-1 text-xs text-ec-ink60">The user sees this reason in the app.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (shown to the user)"
          maxLength={300}
          autoFocus
          className="mt-3 h-28 w-full rounded-xl border border-ec-line p-3 text-sm text-ec-ink focus:border-ec-blue focus:outline-none focus:ring-2 focus:ring-ec-blue/20"
        />
        <div className="mt-1 text-right text-xs text-ec-ink40">{reason.length}/300</div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={button()}>Cancel</button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onConfirm(item.id, reason.trim())}
            className={button({ variant: 'danger' })}
          >
            Confirm reject
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

export function RejectDialog({ item, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-card p-5">
        <h2 className="text-sm font-semibold text-ec-ink">
          Reject {item.docType.toUpperCase()} — {item.user.name ?? item.user.phoneMasked}
        </h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (shown to the user)"
          maxLength={300}
          className="mt-3 h-24 w-full rounded-md border p-2 text-sm text-ec-ink"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm">Cancel</button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onConfirm(item.id, reason.trim())}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirm reject
          </button>
        </div>
      </div>
    </div>
  )
}

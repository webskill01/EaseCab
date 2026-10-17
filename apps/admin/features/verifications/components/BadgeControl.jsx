'use client'

import { cn } from '@/lib/utils'

// Manual verified-driver badge (User.verificationStatus). 'submitted' is set by the
// user flow, not the admin — the admin only grants (approved), denies (rejected), or
// clears (none).
const OPTIONS = ['none', 'approved', 'rejected']
const TONE = { none: 'border-slate-200 bg-slate-50', approved: 'border-emerald-300 bg-emerald-50 text-emerald-700', rejected: 'border-red-300 bg-red-50 text-red-700' }

export function BadgeControl({ status, onChange }) {
  const value = OPTIONS.includes(status) ? status : 'none'
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-ec-ink60">
      Badge
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('h-8 rounded-lg border px-2 text-xs font-semibold text-ec-ink focus:outline-none focus:ring-2 focus:ring-ec-blue/30', TONE[value])}
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

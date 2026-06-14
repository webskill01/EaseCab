'use client'

// Manual verified-driver badge (User.verificationStatus). 'submitted' is set by the
// user flow, not the admin — the admin only grants (approved), denies (rejected), or
// clears (none).
const OPTIONS = ['none', 'approved', 'rejected']

export function BadgeControl({ status, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-ec-ink60">
      Badge
      <select
        value={OPTIONS.includes(status) ? status : 'none'}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border px-2 py-1 text-xs text-ec-ink"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

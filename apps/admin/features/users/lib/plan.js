/** IST short date ("17 Oct 2026"); '—' when missing. */
export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Membership state for display. Mirrors the API's plan filter: active = active and
 * not yet expired; expired = had a membership that lapsed; none = never paid.
 */
export function planOf(sub, now = Date.now()) {
  const until = sub?.validUntil ? new Date(sub.validUntil).getTime() : null
  if (until === null) return { key: 'none', label: 'Never paid', tone: 'slate' }
  if (sub.status === 'active' && until > now) return { key: 'active', label: `Active till ${fmtDate(sub.validUntil)}`, tone: 'green' }
  if (until <= now) return { key: 'expired', label: `Expired ${fmtDate(sub.validUntil)}`, tone: 'amber' }
  return { key: sub.status, label: sub.status, tone: 'red' }
}

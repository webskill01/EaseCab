const FAR = Number.MAX_SAFE_INTEGER

const SORTS = {
  newest: (a, b) => new Date(b.addedAt) - new Date(a.addedAt),
  ending: (a, b) => (a.validUntil ? new Date(a.validUntil).getTime() : FAR) - (b.validUntil ? new Date(b.validUntil).getTime() : FAR),
  months: (a, b) => b.monthsGranted - a.monthsGranted,
}

/**
 * Free members list is small and unpaged, so filter + sort in the browser.
 * q matches name, app name, note, or any run of the phone's digits; status = all | active | ended.
 */
export function filterMembers(items, { q = '', status = 'all', sort = 'newest' } = {}) {
  const needle = q.toLowerCase()
  const digits = q.replace(/\D/g, '')
  return items
    .filter((m) => status === 'all' || (status === 'active') === Boolean(m.validUntil))
    .filter((m) => !needle || ([m.label, m.name, m.note].some((v) => v?.toLowerCase().includes(needle)) || (digits && m.phone?.includes(digits))))
    .sort(SORTS[sort] ?? SORTS.newest)
}

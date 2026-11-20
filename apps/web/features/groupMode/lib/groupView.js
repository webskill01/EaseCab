/** Pure helpers for Group Mode (no React). */

export const GROUP_KEY = Object.freeze({ ALL: 'all', DUTIES: 'duties' })
const SEEN_KEY = 'ec.groupSeen'

/** When the user last opened each group: { [key]: epochMs }. Missing → 0 (all unread). */
export function readSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {} } catch { return {} }
}

export function markSeen(key, at = Date.now()) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeen(), [key]: at })) } catch { /* private mode: unread just won't clear */ }
}

// Indian mobile numbers as drivers type them: +91 / 0 prefix, spaces or dashes inside.
const PHONE_RE = /(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}/g

/**
 * Split message text into plain and phone parts so the thread can make numbers tappable.
 * @param {string} text
 * @returns {{ text: string, phone?: boolean }[]}
 */
export function splitPhones(text) {
  if (!text) return []
  const out = []
  let last = 0
  for (const m of text.matchAll(PHONE_RE)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ text: m[0], phone: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

/**
 * Merge bot rides + duties into one oldest→newest chat list (newest at the bottom).
 * @param {object[]} rides - API bot rides ({ receivedAt })
 * @param {object[]} duties - API posted rides ({ createdAt })
 */
export function mergeThread(rides, duties) {
  const items = [
    ...rides.map((r) => ({ kind: 'ride', at: r.receivedAt, item: r })),
    ...duties.map((d) => ({ kind: 'duty', at: d.createdAt, item: d })),
  ]
  return items.sort((a, b) => new Date(a.at) - new Date(b.at))
}

/** IST calendar-day key, for date dividers. */
export function istDayKey(at) {
  return new Date(new Date(at).getTime() + 330 * 60000).toISOString().slice(0, 10)
}

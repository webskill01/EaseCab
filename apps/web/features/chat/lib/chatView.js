/**
 * Pure chat-view helpers (Step 22) — no React, no I/O, fully unit-tested.
 */

// Presence (P12-8): mirror of shared CHAT.PRESENCE (web doesn't import @easecab/shared).
// Beat every 30s; treat the other party as online if active within 60s (> heartbeat,
// so one dropped beat doesn't flip them offline).
export const PRESENCE_HEARTBEAT_MS = 30000
export const PRESENCE_ONLINE_WINDOW_MS = 60000

/**
 * Tick state for ONE of my own messages: 'read' once the other party's lastRead
 * reaches it, else 'sent'. Inbound messages get 'none' (we never show ticks on the
 * other person's bubbles).
 * @returns {'read' | 'sent' | 'none'}
 */
export function tickState(msg, myId, otherLastReadAt) {
  if (msg.senderId !== myId) return 'none'
  if (otherLastReadAt && new Date(msg.sentAt) <= new Date(otherLastReadAt)) return 'read'
  return 'sent'
}

/**
 * Merge confirmed (Firestore) messages with still-pending optimistic ones, deduped
 * by id (a confirmed message replaces its optimistic twin), sorted ascending by sentAt.
 */
export function mergeLiveMessages(live, optimistic) {
  const ids = new Set(live.map((m) => m.id))
  const pending = optimistic.filter((m) => !ids.has(m.id))
  return [...live, ...pending].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
}

/**
 * The OTHER party's lastReadAt from a chat-doc meta snapshot, given my role: if I am
 * the poster, the other party is the initiator (and vice versa). Null when unset.
 */
export function otherLastReadAt(meta, amPoster) {
  return (amPoster ? meta.initiatorLastReadAt : meta.posterLastReadAt) ?? null
}

/** The OTHER party's lastActiveAt from a chat-doc meta snapshot, given my role. Null when unset. */
export function otherLastActiveAt(meta, amPoster) {
  return (amPoster ? meta.initiatorLastActiveAt : meta.posterLastActiveAt) ?? null
}

/**
 * Presence from the other party's lastActiveAt: 'online' within `windowMs`, 'offline'
 * once stale, 'unknown' when never stamped. Accepts a Date, ISO string, or Firestore
 * Timestamp (`.toMillis()`), mirroring how the chat doc fields arrive over the wire.
 * @returns {'online' | 'offline' | 'unknown'}
 */
export function presenceState(lastActiveAt, nowMs, windowMs) {
  const t = toMillis(lastActiveAt)
  if (t === null) return 'unknown'
  return nowMs - t <= windowMs ? 'online' : 'offline'
}

/** Normalize a Date | ISO string | Firestore Timestamp to epoch ms; null if absent/unparseable. */
export function toMillis(value) {
  if (value == null) return null
  if (typeof value.toMillis === 'function') return value.toMillis()
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

// Our 4 locales → a BCP-47 tag Intl understands ('hinglish' isn't real → Roman 'en').
const INTL_LOCALE = { en: 'en', pa: 'pa', hi: 'hi', hinglish: 'en' }

/**
 * Locale-aware "last seen" relative label (e.g. "2 minutes ago", "yesterday") via
 * Intl.RelativeTimeFormat — no hardcoded English. Null when the time is unknown.
 */
export function lastSeenLabel(ms, nowMs, locale) {
  if (ms == null) return null
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale] ?? 'en', { numeric: 'auto' })
  const diffSec = Math.round((ms - nowMs) / 1000) // negative = in the past
  const abs = Math.abs(diffSec)
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}

/**
 * Pure chat-view helpers (Step 22) — no React, no I/O, fully unit-tested.
 */

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

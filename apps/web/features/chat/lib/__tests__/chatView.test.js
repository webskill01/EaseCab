import { describe, it, expect } from 'vitest'
import { tickState, mergeLiveMessages, otherLastReadAt, otherLastActiveAt, presenceState, toMillis, lastSeenLabel, PRESENCE_ONLINE_WINDOW_MS } from '../chatView'

describe('tickState', () => {
  const mine = { senderId: 'me', sentAt: '2026-06-13T01:00:00Z' }
  it("is 'read' when the other party's lastRead is at/after my message", () => {
    expect(tickState(mine, 'me', '2026-06-13T02:00:00Z')).toBe('read')
    expect(tickState(mine, 'me', '2026-06-13T01:00:00Z')).toBe('read')
  })
  it("is 'sent' when the other party has not read past my message", () => {
    expect(tickState(mine, 'me', '2026-06-13T00:00:00Z')).toBe('sent')
    expect(tickState(mine, 'me', null)).toBe('sent')
  })
  it("is 'none' for inbound messages (no tick on the other party's bubbles)", () => {
    expect(tickState({ senderId: 'other', sentAt: 'x' }, 'me', '2026-06-13T02:00:00Z')).toBe('none')
  })
})

describe('mergeLiveMessages', () => {
  it('drops optimistic messages already confirmed by id and sorts ascending by sentAt', () => {
    const live = [{ id: 'a', sentAt: '2026-06-13T01:00:00Z' }]
    const optimistic = [
      { id: 'tmp', pending: true, sentAt: '2026-06-13T01:05:00Z' },
      { id: 'a', sentAt: 'whatever' },
    ]
    const out = mergeLiveMessages(live, optimistic)
    expect(out.map((m) => m.id)).toEqual(['a', 'tmp'])
  })
  it('returns just the live messages when there are no pending', () => {
    const live = [{ id: 'a', sentAt: '2026-06-13T01:00:00Z' }]
    expect(mergeLiveMessages(live, [])).toEqual(live)
  })
})

describe('otherLastReadAt', () => {
  it('reads the initiator marker when I am the poster, and vice versa', () => {
    const meta = { initiatorLastReadAt: 'i', posterLastReadAt: 'p' }
    expect(otherLastReadAt(meta, true)).toBe('i')
    expect(otherLastReadAt(meta, false)).toBe('p')
    expect(otherLastReadAt({}, true)).toBeNull()
  })
})

describe('otherLastActiveAt', () => {
  it('reads the initiator marker when I am the poster, and vice versa', () => {
    const meta = { initiatorLastActiveAt: 'i', posterLastActiveAt: 'p' }
    expect(otherLastActiveAt(meta, true)).toBe('i')
    expect(otherLastActiveAt(meta, false)).toBe('p')
    expect(otherLastActiveAt({}, true)).toBeNull()
  })
})

describe('toMillis', () => {
  it('parses a Date, an ISO string, and a Firestore Timestamp', () => {
    const d = new Date('2026-06-21T00:00:00Z')
    expect(toMillis(d)).toBe(d.getTime())
    expect(toMillis('2026-06-21T00:00:00Z')).toBe(d.getTime())
    expect(toMillis({ toMillis: () => 123 })).toBe(123)
  })
  it('returns null for absent or unparseable input', () => {
    expect(toMillis(null)).toBeNull()
    expect(toMillis(undefined)).toBeNull()
    expect(toMillis('not-a-date')).toBeNull()
  })
})

describe('presenceState', () => {
  const now = 1_000_000_000_000
  it("is 'online' within the window, 'offline' once stale", () => {
    expect(presenceState(new Date(now - 10_000), now, PRESENCE_ONLINE_WINDOW_MS)).toBe('online')
    expect(presenceState(new Date(now - 120_000), now, PRESENCE_ONLINE_WINDOW_MS)).toBe('offline')
  })
  it("is 'unknown' when never stamped", () => {
    expect(presenceState(null, now, PRESENCE_ONLINE_WINDOW_MS)).toBe('unknown')
  })
})

describe('lastSeenLabel', () => {
  const now = Date.UTC(2026, 5, 21, 12, 0, 0)
  it('formats minutes/hours/days ago and is null when unknown', () => {
    expect(lastSeenLabel(now - 5 * 60_000, now, 'en')).toMatch(/minute/)
    expect(lastSeenLabel(now - 3 * 3_600_000, now, 'en')).toMatch(/hour/)
    expect(lastSeenLabel(null, now, 'en')).toBeNull()
  })
  it('falls back to en formatting for hinglish (not a real BCP-47 tag)', () => {
    expect(lastSeenLabel(now - 5 * 60_000, now, 'hinglish')).toMatch(/minute/)
  })
})

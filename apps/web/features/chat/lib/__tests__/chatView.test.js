import { describe, it, expect } from 'vitest'
import { tickState, mergeLiveMessages, otherLastReadAt } from '../chatView'

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

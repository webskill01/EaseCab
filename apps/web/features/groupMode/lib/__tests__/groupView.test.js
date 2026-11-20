import { describe, it, expect } from 'vitest'
import { splitPhones, mergeThread, istDayKey } from '../groupView'

describe('groupView', () => {
  it('splitPhones finds Indian numbers in the common written forms', () => {
    const parts = splitPhones('Delhi to Agra call 98765 43210 or +91-9123456789 fare 2500')
    expect(parts.filter((p) => p.phone).map((p) => p.text)).toEqual(['98765 43210', '+91-9123456789'])
    expect(parts.map((p) => p.text).join('')).toBe('Delhi to Agra call 98765 43210 or +91-9123456789 fare 2500')
    expect(splitPhones('fare 2500 sedan').some((p) => p.phone)).toBe(false)
  })

  it('mergeThread puts the newest message last', () => {
    const out = mergeThread([{ id: 'r', receivedAt: '2026-11-20T10:00:00Z' }], [{ id: 'd', createdAt: '2026-11-20T09:00:00Z' }])
    expect(out.map((x) => x.item.id)).toEqual(['d', 'r'])
  })

  it('istDayKey rolls over at IST midnight', () => {
    expect(istDayKey('2026-11-20T18:31:00Z')).toBe('2026-11-21')
    expect(istDayKey('2026-11-20T18:29:00Z')).toBe('2026-11-20')
  })
})

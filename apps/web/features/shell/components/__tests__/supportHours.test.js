import { describe, it, expect } from 'vitest'
import { supportOpenNow } from '../SupportButton'

// IST = UTC+5:30, so 9:00 IST = 03:30Z and 17:00 IST = 11:30Z.
describe('supportOpenNow (9am–5pm IST)', () => {
  it('open from 9:00 up to 16:59 IST', () => {
    expect(supportOpenNow(new Date('2026-11-20T03:30:00Z'))).toBe(true)
    expect(supportOpenNow(new Date('2026-11-20T11:29:00Z'))).toBe(true)
  })
  it('closed before 9 and from 17:00 IST', () => {
    expect(supportOpenNow(new Date('2026-11-20T03:29:00Z'))).toBe(false)
    expect(supportOpenNow(new Date('2026-11-20T11:30:00Z'))).toBe(false)
    expect(supportOpenNow(new Date('2026-11-20T20:00:00Z'))).toBe(false)
  })
})

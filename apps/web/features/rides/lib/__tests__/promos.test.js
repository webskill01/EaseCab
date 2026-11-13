import { describe, it, expect } from 'vitest'
import { activePromo, shouldPopup, istDay } from '../promos'

const P = [{ id: 'x', key: 'x', from: '2026-11-13T00:00:00+05:30', until: '2026-11-21T00:00:00+05:30' }]
const at = (s) => new Date(s)

describe('promos', () => {
  it('activePromo: live only inside its IST window', () => {
    expect(activePromo(at('2026-11-12T23:59:00+05:30'), P)).toBeNull()
    expect(activePromo(at('2026-11-13T00:00:00+05:30'), P)?.id).toBe('x')
    expect(activePromo(at('2026-11-20T23:59:00+05:30'), P)?.id).toBe('x')
    expect(activePromo(at('2026-11-21T00:00:00+05:30'), P)).toBeNull()
  })

  it('istDay rolls over at IST midnight, not UTC', () => {
    expect(istDay(at('2026-11-13T18:29:00Z'))).toBe('2026-11-13')
    expect(istDay(at('2026-11-13T18:31:00Z'))).toBe('2026-11-14')
  })

  it('shouldPopup: once a day on a lucky roll, never after the driver opened it', () => {
    const now = at('2026-11-14T10:00:00+05:30')
    const lucky = () => 0.1
    expect(shouldPopup(P[0], {}, now, lucky)).toBe(true)
    expect(shouldPopup(P[0], {}, now, () => 0.9)).toBe(false)
    expect(shouldPopup(P[0], { shownDay: { x: '2026-11-14' } }, now, lucky)).toBe(false)
    expect(shouldPopup(P[0], { shownDay: { x: '2026-11-13' } }, now, lucky)).toBe(true)
    expect(shouldPopup(P[0], { opened: { x: true } }, now, lucky)).toBe(false)
    expect(shouldPopup(null, {}, now, lucky)).toBe(false)
  })
})

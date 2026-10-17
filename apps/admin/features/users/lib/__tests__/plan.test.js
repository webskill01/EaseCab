import { describe, it, expect } from 'vitest'
import { planOf } from '../plan'

const NOW = new Date('2026-10-17T12:00:00Z').getTime()

describe('planOf', () => {
  it('never paid when there is no subscription or no expiry', () => {
    expect(planOf(null, NOW).key).toBe('none')
    expect(planOf({ status: 'expired', validUntil: null }, NOW).key).toBe('none')
  })
  it('active only while status is active and expiry is ahead', () => {
    expect(planOf({ status: 'active', validUntil: '2026-11-01T00:00:00Z' }, NOW).key).toBe('active')
  })
  it('expired once the expiry has passed, whatever the stored status', () => {
    expect(planOf({ status: 'active', validUntil: '2026-10-01T00:00:00Z' }, NOW).key).toBe('expired')
  })
})

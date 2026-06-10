import { describe, it, expect } from 'vitest'
import { membershipView, MEMBERSHIP_STATE } from '../membership'

const NOW = Date.parse('2026-06-06T10:00:00.000Z')
const inDays = (d) => new Date(NOW + d * 86400000).toISOString()

describe('membershipView', () => {
  it('active paid → active state, no banner', () => {
    const v = membershipView({ status: 'active', isActive: true, expiresAt: inDays(20) }, NOW)
    expect(v.state).toBe(MEMBERSHIP_STATE.ACTIVE)
  })

  it('trial → trial state with whole days left (ceil)', () => {
    const v = membershipView({ status: 'trial', isActive: true, trialExpiresAt: inDays(6.4) }, NOW)
    expect(v.state).toBe(MEMBERSHIP_STATE.TRIAL)
    expect(v.daysLeft).toBe(7)
  })

  it('trial in its final hours → ending flag, daysLeft 1', () => {
    const v = membershipView({ status: 'trial', isActive: true, trialExpiresAt: inDays(0.5) }, NOW)
    expect(v.state).toBe(MEMBERSHIP_STATE.TRIAL)
    expect(v.daysLeft).toBe(1)
    expect(v.ending).toBe(true)
  })

  it('expired / inactive → expired state', () => {
    expect(membershipView({ status: 'expired', isActive: false }, NOW).state).toBe(MEMBERSHIP_STATE.EXPIRED)
    expect(membershipView({ status: 'trial', isActive: false, trialExpiresAt: inDays(-1) }, NOW).state).toBe(MEMBERSHIP_STATE.EXPIRED)
    expect(membershipView(null, NOW).state).toBe(MEMBERSHIP_STATE.EXPIRED)
  })
})

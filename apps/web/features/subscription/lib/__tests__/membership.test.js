import { describe, it, expect } from 'vitest'
import { membershipView, MEMBERSHIP_STATE } from '../membership'

describe('membershipView', () => {
  it('active paid → ACTIVE', () => {
    expect(membershipView({ status: 'active', isActive: true, expiresAt: '2036-01-01T00:00:00Z' })).toEqual({ state: MEMBERSHIP_STATE.ACTIVE })
  })

  it('never had a membership → NONE', () => {
    expect(membershipView({ status: 'expired', isActive: false, expiresAt: null })).toEqual({ state: MEMBERSHIP_STATE.NONE })
  })

  it('no subscription payload → NONE', () => {
    expect(membershipView(null)).toEqual({ state: MEMBERSHIP_STATE.NONE })
  })

  it('paid window lapsed → EXPIRED', () => {
    expect(membershipView({ status: 'active', isActive: false, expiresAt: '2026-09-01T00:00:00Z' })).toEqual({ state: MEMBERSHIP_STATE.EXPIRED })
  })
})

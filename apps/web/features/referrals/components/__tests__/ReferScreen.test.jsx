import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, render, waitFor } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/useReferrals', () => ({ useReferrals: vi.fn(), useClaimReferrer: vi.fn() }))

import { useReferrals, useClaimReferrer } from '../../hooks/useReferrals'
import { ReferScreen } from '../ReferScreen'
import { AutoClaimReferral } from '../AutoClaimReferral'
import { saveInvite, readInvite, captureInviteFromUrl } from '../../lib/invite'

const CODE = '11111111-1111-4111-8111-111111111111'
const overview = (over = {}) => ({
  enabled: true,
  code: CODE,
  referrals: [
    { id: 'a', name: 'SUNIL', joinedAt: '2026-10-18T00:00:00Z', paid: true, rewarded: false },
    { id: 'b', name: null, joinedAt: '2026-10-19T00:00:00Z', paid: false, rewarded: false },
  ],
  perReward: 2, monthsEarned: 0, towardNext: 1, referredBy: null, canClaim: false, ...over,
})
const claimStub = (over = {}) => ({ mutate: vi.fn(), isPending: false, isSuccess: false, isError: false, ...over })

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); useClaimReferrer.mockReturnValue(claimStub()) })
afterEach(() => { delete navigator.share })

describe('ReferScreen', () => {
  it('shows progress + statuses and shares my invite link through the OS share sheet', async () => {
    navigator.share = vi.fn().mockResolvedValue()
    useReferrals.mockReturnValue({ data: overview(), isLoading: false, isError: false })
    renderWithIntl(<ReferScreen />)
    expect(screen.getByText('1 of 2 toward your next free month')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Not paid yet')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Share invite link'))
    await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1))
    const { text } = navigator.share.mock.calls[0][0]
    expect(text).toContain(`https://easecab.com/r/${CODE}`)
    expect(text).toMatch(/^Veer, EaseCab app use karo/)
  })

  it('falls back to wa.me without Web Share', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    useReferrals.mockReturnValue({ data: overview({ monthsEarned: 2 }), isLoading: false, isError: false })
    renderWithIntl(<ReferScreen />)
    expect(screen.getByText('2 free months earned')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Share invite link'))
    expect(open.mock.calls[0][0]).toMatch(/^https:\/\/wa\.me\/\?text=/)
    open.mockRestore()
  })

  it('renders nothing outside the rollout', () => {
    useReferrals.mockReturnValue({ data: { enabled: false }, isLoading: false, isError: false })
    const { container } = renderWithIntl(<ReferScreen />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('AutoClaimReferral', () => {
  it('claims a stored invite once and clears it', () => {
    saveInvite(CODE)
    const mutate = vi.fn((_b, { onSuccess }) => onSuccess())
    useClaimReferrer.mockReturnValue(claimStub({ mutate }))
    useReferrals.mockReturnValue({ data: overview({ canClaim: true }) })
    render(<AutoClaimReferral />)
    expect(useReferrals).toHaveBeenCalledWith({ enabled: true })
    expect(mutate).toHaveBeenCalledWith({ code: CODE }, expect.any(Object))
    expect(readInvite()).toBeNull()
  })

  it('keeps the invite after a network/5xx failure (retry next open), drops it on a final 409', () => {
    saveInvite(CODE)
    let fail = { status: 0 }
    const mutate = vi.fn((_b, { onError }) => onError(fail))
    useClaimReferrer.mockReturnValue(claimStub({ mutate }))
    useReferrals.mockReturnValue({ data: overview({ canClaim: true }) })
    const { unmount } = render(<AutoClaimReferral />)
    expect(readInvite()).toBe(CODE)
    unmount()
    fail = { status: 409 }
    render(<AutoClaimReferral />)
    expect(readInvite()).toBeNull()
  })

  it('captures ?ref=<code> from the Android app launch URL; ignores junk', () => {
    window.history.replaceState(null, '', '/feed?bubble=1&ref=not-a-code')
    captureInviteFromUrl()
    expect(readInvite()).toBeNull()
    window.history.replaceState(null, '', `/feed?bubble=1&ref=${CODE}`)
    captureInviteFromUrl()
    expect(readInvite()).toBe(CODE)
    window.history.replaceState(null, '', '/')
  })

  it('drops the invite when the claim window is over; does nothing without one', () => {
    saveInvite(CODE)
    useReferrals.mockReturnValue({ data: overview({ canClaim: false }) })
    const { unmount } = render(<AutoClaimReferral />)
    expect(readInvite()).toBeNull()
    unmount()
    const mutate = vi.fn()
    useClaimReferrer.mockReturnValue(claimStub({ mutate }))
    useReferrals.mockReturnValue({ data: undefined })
    render(<AutoClaimReferral />)
    expect(useReferrals).toHaveBeenLastCalledWith({ enabled: false })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('ignores a malformed code', () => {
    saveInvite('../../evil')
    expect(readInvite()).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/useReferrals', () => ({ useReferrals: vi.fn(), useClaimReferrer: vi.fn() }))
vi.mock('@/features/profile/hooks/useProfile', () => ({ useProfile: () => ({ data: { phone: '+919877669671' } }) }))

import { useReferrals, useClaimReferrer } from '../../hooks/useReferrals'
import { ReferScreen } from '../ReferScreen'
import { ClaimReferrer } from '../ClaimReferrer'

const overview = (over = {}) => ({
  enabled: true,
  referrals: [
    { id: 'a', name: 'SUNIL', joinedAt: '2026-10-18T00:00:00Z', paid: true, rewarded: false },
    { id: 'b', name: null, joinedAt: '2026-10-19T00:00:00Z', paid: false, rewarded: false },
  ],
  perReward: 2, monthsEarned: 0, towardNext: 1, referredBy: null, canClaim: false, ...over,
})
const claimStub = (over = {}) => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null, ...over })

beforeEach(() => { vi.clearAllMocks(); useClaimReferrer.mockReturnValue(claimStub()) })

describe('ReferScreen', () => {
  it('shows progress, statuses and a WhatsApp invite carrying my number + Play link', () => {
    useReferrals.mockReturnValue({ data: overview(), isLoading: false, isError: false })
    renderWithIntl(<ReferScreen />)
    expect(screen.getByText('1 of 2 toward your next free month')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Not paid yet')).toBeInTheDocument()
    const href = decodeURIComponent(screen.getByText('Invite on WhatsApp').closest('a').getAttribute('href'))
    expect(href).toContain('9877669671')
    expect(href).toContain('com.easecab.app')
    expect(screen.queryByText('Who told you about EaseCab?')).not.toBeInTheDocument()
  })

  it('shows months earned and the claim box while the window is open', () => {
    useReferrals.mockReturnValue({ data: overview({ monthsEarned: 2, canClaim: true }), isLoading: false, isError: false })
    renderWithIntl(<ReferScreen />)
    expect(screen.getByText('2 free months earned')).toBeInTheDocument()
    expect(screen.getByText('Who told you about EaseCab?')).toBeInTheDocument()
  })

  it('renders nothing outside the rollout', () => {
    useReferrals.mockReturnValue({ data: { enabled: false }, isLoading: false, isError: false })
    const { container } = renderWithIntl(<ReferScreen />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ClaimReferrer', () => {
  it('submits the typed number once 10 digits are in', () => {
    const mutate = vi.fn()
    useClaimReferrer.mockReturnValue(claimStub({ mutate }))
    renderWithIntl(<ClaimReferrer />)
    const save = screen.getByText('Save')
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('10-digit mobile'), { target: { value: '98776 69671' } })
    fireEvent.click(save)
    expect(mutate).toHaveBeenCalledWith({ phone: '98776 69671' })
  })

  it('maps a 404 to "no account" and shows the referrer on success', () => {
    useClaimReferrer.mockReturnValue(claimStub({ error: { status: 404 } }))
    const { unmount } = renderWithIntl(<ClaimReferrer />)
    expect(screen.getByText('No EaseCab account with this number.')).toBeInTheDocument()
    unmount()
    useClaimReferrer.mockReturnValue(claimStub({ isSuccess: true, data: { referrer: { name: 'SUNIL' } } }))
    renderWithIntl(<ClaimReferrer />)
    expect(screen.getByText('Referred by SUNIL')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/useMembership', () => ({ useMembership: vi.fn() }))
vi.mock('../../hooks/useCheckout', () => ({ useCheckout: vi.fn() }))
vi.mock('../PaymentHistory', () => ({ PaymentHistory: () => <div data-testid="history" /> }))

import { useMembership } from '../../hooks/useMembership'
import { useCheckout } from '../../hooks/useCheckout'
import { MembershipScreen } from '../MembershipScreen'

const checkoutStub = (over = {}) => ({ start: vi.fn(), checkingOut: false, errorKey: null, succeeded: false, ...over })

beforeEach(() => vi.clearAllMocks())

describe('MembershipScreen', () => {
  it('renders a trial state with days left + Upgrade CTA', () => {
    useMembership.mockReturnValue({ data: { status: 'trial', isActive: true, trialExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString() }, isLoading: false, isError: false })
    useCheckout.mockReturnValue(checkoutStub())
    renderWithIntl(<MembershipScreen />)
    expect(screen.getByText(/Free trial/)).toBeInTheDocument()
    expect(screen.getByText(/day(s)? left/)).toBeInTheDocument()
    expect(screen.getByText('Upgrade to EaseCab Plus')).toBeInTheDocument()
    expect(screen.getByText('Monthly Plan')).toBeInTheDocument()
  })

  it('renders an expired state with the Subscribe CTA and fires checkout', () => {
    useMembership.mockReturnValue({ data: { status: 'expired', isActive: false }, isLoading: false, isError: false })
    const start = vi.fn()
    useCheckout.mockReturnValue(checkoutStub({ start }))
    renderWithIntl(<MembershipScreen />)
    const cta = screen.getByText('Subscribe now')
    fireEvent.click(cta)
    expect(start).toHaveBeenCalled()
  })

  it('shows the success panel after a credited checkout', () => {
    useMembership.mockReturnValue({ data: { status: 'trial', isActive: true, trialExpiresAt: new Date().toISOString() }, isLoading: false, isError: false })
    useCheckout.mockReturnValue(checkoutStub({ succeeded: true }))
    renderWithIntl(<MembershipScreen />)
    expect(screen.getByText("You're all set!")).toBeInTheDocument()
  })

  it('surfaces a checkout error', () => {
    useMembership.mockReturnValue({ data: { status: 'active', isActive: true, expiresAt: new Date().toISOString() }, isLoading: false, isError: false })
    useCheckout.mockReturnValue(checkoutStub({ errorKey: 'error.checkout' }))
    renderWithIntl(<MembershipScreen />)
    expect(screen.getByText("Payment couldn't be completed. Please try again.")).toBeInTheDocument()
  })
})

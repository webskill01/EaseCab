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
  it('never-subscribed user sees Not subscribed + Subscribe now and fires checkout', () => {
    useMembership.mockReturnValue({ data: { status: 'expired', isActive: false, expiresAt: null }, isLoading: false, isError: false })
    const start = vi.fn()
    useCheckout.mockReturnValue(checkoutStub({ start }))
    renderWithIntl(<MembershipScreen />)
    expect(screen.getByText('EaseCab · Not subscribed')).toBeInTheDocument()
    expect(screen.getByText('Monthly Plan')).toBeInTheDocument()
    const cta = screen.getByText('Subscribe now')
    fireEvent.click(cta)
    expect(start).toHaveBeenCalled()
  })

  it('lapsed member sees Membership ended + Renew', () => {
    useMembership.mockReturnValue({ data: { status: 'active', isActive: false, expiresAt: '2026-09-01T00:00:00Z' }, isLoading: false, isError: false })
    useCheckout.mockReturnValue(checkoutStub())
    renderWithIntl(<MembershipScreen />)
    expect(screen.getByText('Your membership ended. Renew to contact drivers again.')).toBeInTheDocument()
    expect(screen.queryByText(/trial/i)).not.toBeInTheDocument()
  })

  it('shows the success panel after a credited checkout', () => {
    useMembership.mockReturnValue({ data: { status: 'active', isActive: true, expiresAt: new Date().toISOString() }, isLoading: false, isError: false })
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

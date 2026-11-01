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
    // New users default to the 1-month plan
    fireEvent.click(screen.getByText('Subscribe now · ₹149'))
    expect(start).toHaveBeenCalledWith('m1')
  })

  it('shows discount badges and checks out the picked plan', () => {
    useMembership.mockReturnValue({ data: { status: 'expired', isActive: false, expiresAt: null }, isLoading: false, isError: false })
    const start = vi.fn()
    useCheckout.mockReturnValue(checkoutStub({ start }))
    renderWithIntl(<MembershipScreen />)
    expect(screen.getByText('Save ₹589 · 33% OFF')).toBeInTheDocument()
    expect(screen.getByText('₹1,788')).toHaveClass('line-through')
    expect(screen.getByText('Most popular')).toBeInTheDocument()
    expect(screen.getByText('Just ₹100/month')).toBeInTheDocument()
    fireEvent.click(screen.getByText('12 months'))
    fireEvent.click(screen.getByText('Subscribe now · ₹1,199'))
    expect(start).toHaveBeenCalledWith('m12')
  })

  it('lapsed member sees Membership ended + Renew', () => {
    useMembership.mockReturnValue({ data: { status: 'active', isActive: false, expiresAt: '2026-09-01T00:00:00Z' }, isLoading: false, isError: false })
    useCheckout.mockReturnValue(checkoutStub())
    renderWithIntl(<MembershipScreen />)
    expect(screen.getByText('Your membership ended. Renew to contact drivers again.')).toBeInTheDocument()
    expect(screen.queryByText(/trial/i)).not.toBeInTheDocument()
    // Returning members default to the popular 6-month plan
    expect(screen.getByText('Renew membership · ₹749')).toBeInTheDocument()
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

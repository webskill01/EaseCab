import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/usePayments', () => ({ usePayments: vi.fn() }))
import { usePayments } from '../../hooks/usePayments'
import { PaymentHistory } from '../PaymentHistory'

beforeEach(() => vi.clearAllMocks())

describe('PaymentHistory', () => {
  it('renders a captured payment row (amount + Paid badge)', () => {
    usePayments.mockReturnValue({ data: { payments: [{ id: 'p1', amount: 14900, status: 'captured', paidAt: '2026-06-12T10:00:00Z', paymentId: 'pay_1' }] } })
    renderWithIntl(<PaymentHistory />)
    expect(screen.getByText('₹149')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })

  it('renders the empty state when there are no payments', () => {
    usePayments.mockReturnValue({ data: { payments: [] } })
    renderWithIntl(<PaymentHistory />)
    expect(screen.getByText('No payments yet.')).toBeInTheDocument()
  })
})

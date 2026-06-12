import { describe, it, expect } from 'vitest'
import { formatRupees, formatPaymentDate, paymentVM } from '../paymentView'

describe('formatRupees', () => {
  it('renders whole rupees with no decimals', () => {
    expect(formatRupees(14900)).toBe('₹149')
  })
  it('renders a fractional amount with two decimals', () => {
    expect(formatRupees(14950)).toBe('₹149.50')
  })
  it('handles a missing amount as ₹0', () => {
    expect(formatRupees(undefined)).toBe('₹0')
  })
})

describe('formatPaymentDate', () => {
  it('formats an ISO date as DD Mon YYYY', () => {
    expect(formatPaymentDate('2026-06-12T10:00:00Z')).toBe('12 Jun 2026')
  })
  it('returns empty string for a missing or bad date', () => {
    expect(formatPaymentDate(null)).toBe('')
    expect(formatPaymentDate('not-a-date')).toBe('')
  })
})

describe('paymentVM', () => {
  it('maps a payment row to its display shape', () => {
    const vm = paymentVM({ id: 'p1', amount: 14900, status: 'captured', paidAt: '2026-06-12T10:00:00Z', paymentId: 'pay_1' })
    expect(vm).toEqual({ id: 'p1', amount: '₹149', status: 'captured', date: '12 Jun 2026', paymentId: 'pay_1' })
  })
})

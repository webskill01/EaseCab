import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { getMembership, createCheckout, verifyPayment, listPayments } from '../subscriptionApi'

beforeEach(() => vi.clearAllMocks())

describe('getMembership', () => {
  it('GETs /subscriptions/me and returns the status payload', async () => {
    apiFetch.mockResolvedValue({ data: { status: 'trial', isActive: true, trialExpiresAt: 't', expiresAt: null } })
    const out = await getMembership()
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions/me')
    expect(out.status).toBe('trial')
    expect(out.isActive).toBe(true)
  })
})

describe('createCheckout', () => {
  it('POSTs /subscriptions/checkout and returns the order', async () => {
    apiFetch.mockResolvedValue({ data: { orderId: 'order_1', amount: 14900, currency: 'INR', keyId: 'rzp_x' } })
    const out = await createCheckout()
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions/checkout', { method: 'POST' })
    expect(out.orderId).toBe('order_1')
  })
})

describe('verifyPayment', () => {
  it('POSTs /subscriptions/verify with the razorpay callback body', async () => {
    apiFetch.mockResolvedValue({ data: { credited: true } })
    const body = { orderId: 'order_1', paymentId: 'pay_1', signature: 'sig' }
    const out = await verifyPayment(body)
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions/verify', { method: 'POST', body: JSON.stringify(body) })
    expect(out.credited).toBe(true)
  })
})

describe('listPayments', () => {
  it('GETs the first page without a cursor', async () => {
    apiFetch.mockResolvedValue({ data: { payments: [{ id: 'p1' }] }, meta: { nextCursor: 'c2' } })
    const out = await listPayments()
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions/payments')
    expect(out.payments).toHaveLength(1)
    expect(out.nextCursor).toBe('c2')
  })

  it('appends an encoded cursor and defaults nextCursor to null', async () => {
    apiFetch.mockResolvedValue({ data: { payments: [] }, meta: {} })
    const out = await listPayments('c2 x')
    expect(apiFetch).toHaveBeenCalledWith('/subscriptions/payments?cursor=c2%20x')
    expect(out.nextCursor).toBeNull()
  })
})

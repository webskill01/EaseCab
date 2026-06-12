import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/subscriptionApi', () => ({
  createCheckout: vi.fn(),
  verifyPayment: vi.fn(),
}))
vi.mock('../../services/razorpayClient', () => ({ openCheckout: vi.fn() }))

import { createCheckout, verifyPayment } from '../../services/subscriptionApi'
import { openCheckout } from '../../services/razorpayClient'
import { useCheckout } from '../useCheckout'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const ORDER = { orderId: 'order_1', amount: 14900, currency: 'INR', keyId: 'rzp_x' }
beforeEach(() => vi.clearAllMocks())

describe('useCheckout', () => {
  it('runs checkout → popup → verify and succeeds', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockResolvedValue({ paymentId: 'pay_1', signature: 'sig' })
    verifyPayment.mockResolvedValue({ credited: true })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    expect(openCheckout).toHaveBeenCalledWith(expect.objectContaining({ order: ORDER }))
    expect(verifyPayment).toHaveBeenCalledWith({ orderId: 'order_1', paymentId: 'pay_1', signature: 'sig' })
    await waitFor(() => expect(result.current.succeeded).toBe(true))
    expect(result.current.errorKey).toBeNull()
  })

  it('treats a dismissed popup as a non-error (no errorKey, not succeeded)', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockRejectedValue(new Error('RAZORPAY_DISMISSED'))

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    expect(verifyPayment).not.toHaveBeenCalled()
    expect(result.current.errorKey).toBeNull()
    expect(result.current.succeeded).toBe(false)
  })

  it('sets errorKey when verify reports it was not credited', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockResolvedValue({ paymentId: 'pay_1', signature: 'sig' })
    verifyPayment.mockResolvedValue({ credited: false })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    await waitFor(() => expect(result.current.errorKey).toBe('error.checkout'))
    expect(result.current.succeeded).toBe(false)
  })
})

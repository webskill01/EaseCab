import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/subscriptionApi', () => ({
  createCheckout: vi.fn(),
  verifyPayment: vi.fn(),
}))
vi.mock('../../services/cashfreeClient', () => ({ openCheckout: vi.fn() }))

import { createCheckout, verifyPayment } from '../../services/subscriptionApi'
import { openCheckout } from '../../services/cashfreeClient'
import { useCheckout } from '../useCheckout'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const ORDER = { orderId: 'sub_1', paymentSessionId: 'session_1', amount: 14900 }
beforeEach(() => vi.clearAllMocks())

describe('useCheckout', () => {
  it('runs checkout → modal → verify and succeeds', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockResolvedValue()
    verifyPayment.mockResolvedValue({ credited: true })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    expect(openCheckout).toHaveBeenCalledWith(expect.objectContaining({ order: ORDER }))
    expect(verifyPayment).toHaveBeenCalledWith({ orderId: 'sub_1' })
    await waitFor(() => expect(result.current.succeeded).toBe(true))
    expect(result.current.errorKey).toBeNull()
  })

  it('treats a closed-but-unpaid modal as a non-error (no errorKey, not succeeded)', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockResolvedValue()
    verifyPayment.mockResolvedValue({ credited: false, reason: 'not_paid' })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    expect(result.current.errorKey).toBeNull()
    expect(result.current.succeeded).toBe(false)
  })

  it('sets errorKey when verify reports it was not credited', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockResolvedValue()
    verifyPayment.mockResolvedValue({ credited: false, reason: 'unknown_order' })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    await waitFor(() => expect(result.current.errorKey).toBe('error.checkout'))
    expect(result.current.succeeded).toBe(false)
  })

  it('counts a webhook-first duplicate as success', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockResolvedValue()
    verifyPayment.mockResolvedValue({ credited: false, reason: 'duplicate' })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    await waitFor(() => expect(result.current.succeeded).toBe(true))
  })

  it('skips the modal when the API reports an earlier order already paid', async () => {
    createCheckout.mockResolvedValue({ alreadyPaid: true })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    expect(openCheckout).not.toHaveBeenCalled()
    expect(verifyPayment).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.succeeded).toBe(true))
  })

  it('shows the pending notice (not an error) when the bank has not confirmed yet', async () => {
    createCheckout.mockResolvedValue(ORDER)
    openCheckout.mockResolvedValue()
    verifyPayment.mockResolvedValue({ credited: false, reason: 'pending' })

    const { result } = renderHook(() => useCheckout(), { wrapper })
    await act(async () => { await result.current.start() })

    await waitFor(() => expect(result.current.pending).toBe(true))
    expect(result.current.errorKey).toBeNull()
    expect(result.current.succeeded).toBe(false)
  })
})

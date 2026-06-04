import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
vi.mock('../../services/authApi', () => ({ requestOtp: vi.fn(), verifyOtp: vi.fn() }))
vi.mock('../../services/otpClient', () => ({ sendOtp: vi.fn(), confirm: vi.fn() }))

import { requestOtp, verifyOtp } from '../../services/authApi'
import { sendOtp, confirm } from '../../services/otpClient'
import { useOtpLogin } from '../useOtpLogin'

beforeEach(() => vi.clearAllMocks())

describe('useOtpLogin', () => {
  it('phone → otp on a successful gate + send', async () => {
    requestOtp.mockResolvedValue({ sent: true })
    sendOtp.mockResolvedValue({ confirm: vi.fn() })
    const { result } = renderHook(() => useOtpLogin())
    await act(async () => { await result.current.submitPhone('9876543210') })
    expect(requestOtp).toHaveBeenCalledWith('+919876543210')
    expect(sendOtp).toHaveBeenCalledWith('+919876543210')
    expect(result.current.phase).toBe('otp')
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error key when the gate is rate-limited (stays on phone)', async () => {
    requestOtp.mockRejectedValue({ code: 'RATE_LIMITED' })
    const { result } = renderHook(() => useOtpLogin())
    await act(async () => { await result.current.submitPhone('9876543210') })
    expect(result.current.phase).toBe('phone')
    expect(result.current.error).toBe('errors.rateLimited')
    expect(sendOtp).not.toHaveBeenCalled()
  })

  it('otp → done for a new user', async () => {
    requestOtp.mockResolvedValue({})
    const cr = { confirm: vi.fn() }
    sendOtp.mockResolvedValue(cr)
    confirm.mockResolvedValue('id-token')
    verifyOtp.mockResolvedValue({ user: { id: 'u1' }, isNewUser: true })
    const { result } = renderHook(() => useOtpLogin())
    await act(async () => { await result.current.submitPhone('9876543210') })
    await act(async () => { await result.current.submitOtp('123456') })
    expect(confirm).toHaveBeenCalledWith(cr, '123456')
    expect(verifyOtp).toHaveBeenCalledWith('id-token')
    expect(result.current.phase).toBe('done')
    expect(replace).not.toHaveBeenCalled()
  })

  it('otp → redirect to /feed for a returning user', async () => {
    requestOtp.mockResolvedValue({})
    sendOtp.mockResolvedValue({ confirm: vi.fn() })
    confirm.mockResolvedValue('id-token')
    verifyOtp.mockResolvedValue({ user: { id: 'u1' }, isNewUser: false })
    const { result } = renderHook(() => useOtpLogin())
    await act(async () => { await result.current.submitPhone('9876543210') })
    await act(async () => { await result.current.submitOtp('123456') })
    expect(replace).toHaveBeenCalledWith('/feed')
  })

  it('changeNumber returns to the phone phase', async () => {
    requestOtp.mockResolvedValue({})
    sendOtp.mockResolvedValue({ confirm: vi.fn() })
    const { result } = renderHook(() => useOtpLogin())
    await act(async () => { await result.current.submitPhone('9876543210') })
    act(() => { result.current.changeNumber() })
    expect(result.current.phase).toBe('phone')
  })
})

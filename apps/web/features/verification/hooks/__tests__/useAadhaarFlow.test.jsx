import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
vi.mock('../../services/verificationApi', () => ({ startAadhaar: vi.fn(), verifyAadhaar: vi.fn() }))
vi.mock('../../lib/prefill', () => ({ stashPrefill: vi.fn() }))
import { startAadhaar, verifyAadhaar } from '../../services/verificationApi'
import { stashPrefill } from '../../lib/prefill'
import { useAadhaarFlow } from '../useAadhaarFlow'

beforeEach(() => vi.clearAllMocks())

describe('useAadhaarFlow', () => {
  it('input → otp on a valid number', async () => {
    startAadhaar.mockResolvedValue({ clientId: 'c1' })
    const { result } = renderHook(() => useAadhaarFlow())
    await act(async () => { await result.current.submitAadhaar('123456789012') })
    expect(result.current.phase).toBe('otp')
  })
  it('rejects a non-12-digit number without calling the API', async () => {
    const { result } = renderHook(() => useAadhaarFlow())
    await act(async () => { await result.current.submitAadhaar('123') })
    expect(result.current.errorKey).toBe('errors.invalidAadhaar')
    expect(startAadhaar).not.toHaveBeenCalled()
  })
  it('otp success → done + stashes demographics', async () => {
    startAadhaar.mockResolvedValue({ clientId: 'c1' })
    verifyAadhaar.mockResolvedValue({ verified: true, name: 'A', dob: '1990-01-01', gender: 'M', address: 'X' })
    const { result } = renderHook(() => useAadhaarFlow())
    await act(async () => { await result.current.submitAadhaar('123456789012') })
    await act(async () => { await result.current.submitOtp('123456') })
    expect(result.current.phase).toBe('done')
    expect(stashPrefill).toHaveBeenCalledWith({ name: 'A', dob: '1990-01-01', gender: 'M', address: 'X' })
  })
  it('maps RATE_LIMITED to a key', async () => {
    startAadhaar.mockRejectedValue({ code: 'RATE_LIMITED' })
    const { result } = renderHook(() => useAadhaarFlow())
    await act(async () => { await result.current.submitAadhaar('123456789012') })
    expect(result.current.errorKey).toBe('errors.rateLimited')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
vi.mock('../../services/verificationApi', () => ({ verifyDl: vi.fn(), verifyRc: vi.fn() }))
import { verifyDl, verifyRc } from '../../services/verificationApi'
import { useDriverVerify } from '../useDriverVerify'

beforeEach(() => vi.clearAllMocks())

describe('useDriverVerify', () => {
  it('submitDl stores the result', async () => {
    verifyDl.mockResolvedValue({ verified: true, validUpto: '2030-01-01', cov: 'LMV' })
    const { result } = renderHook(() => useDriverVerify())
    await act(async () => { await result.current.submitDl({ dlNumber: 'PB1020200012345', dob: '1990-05-20' }) })
    await waitFor(() => expect(result.current.dlResult).toMatchObject({ cov: 'LMV' }))
  })
  it('submitRc maps a verify failure to a key', async () => {
    verifyRc.mockRejectedValue({ code: 'VALIDATION_ERROR' })
    const { result } = renderHook(() => useDriverVerify())
    await act(async () => { await result.current.submitRc('PB10AB1234') })
    await waitFor(() => expect(result.current.rcErrorKey).toBe('errors.verifyFailed'))
  })
})

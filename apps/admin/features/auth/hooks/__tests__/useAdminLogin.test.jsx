import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminLogin } from '../useAdminLogin'
import { adminLogin } from '../../services/adminApi'

vi.mock('../../services/adminApi', () => ({ adminLogin: vi.fn() }))
const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => { vi.clearAllMocks() })

describe('useAdminLogin', () => {
  it('on success redirects to /', async () => {
    adminLogin.mockResolvedValue({ id: 'a1', role: 'super' })
    const { result } = renderHook(() => useAdminLogin())
    await act(async () => { await result.current.submit('a@x.com', 'pw12345678') })
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
    expect(result.current.errorKey).toBe(null)
  })

  it('on failure surfaces the errorKey and does not redirect', async () => {
    adminLogin.mockRejectedValue({ code: 'AUTH_REQUIRED' })
    const { result } = renderHook(() => useAdminLogin())
    await act(async () => { await result.current.submit('a@x.com', 'wrongpass') })
    expect(result.current.errorKey).toBe('AUTH_REQUIRED')
    expect(replace).not.toHaveBeenCalled()
  })

  it('maps a thrown error with no code to INTERNAL_ERROR', async () => {
    adminLogin.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useAdminLogin())
    await act(async () => { await result.current.submit('a@x.com', 'wrongpass') })
    expect(result.current.errorKey).toBe('INTERNAL_ERROR')
  })
})

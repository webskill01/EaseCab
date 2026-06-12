import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
vi.mock('../../services/profileApi', () => ({ updateProfile: vi.fn() }))
import { updateProfile } from '../../services/profileApi'
import { useUpdateProfile } from '../useUpdateProfile'

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
beforeEach(() => vi.clearAllMocks())

describe('useUpdateProfile', () => {
  it('flips saved on success', async () => {
    updateProfile.mockResolvedValue({ id: 'u1', profileComplete: true })
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })
    act(() => result.current.save({ name: 'A' }))
    await waitFor(() => expect(result.current.saved).toBe(true))
    expect(result.current.errorKey).toBeNull()
  })
  it('maps an error to an i18n key', async () => {
    updateProfile.mockRejectedValue({ code: 'VALIDATION_ERROR' })
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })
    act(() => result.current.save({ name: 'A' }))
    await waitFor(() => expect(result.current.errorKey).toBe('error.save'))
  })
})

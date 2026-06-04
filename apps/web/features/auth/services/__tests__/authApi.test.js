import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { requestOtp, verifyOtp, logout, refreshSession } from '../authApi'

beforeEach(() => vi.clearAllMocks())

describe('authApi', () => {
  it('requestOtp posts the phone to /auth/send-otp', async () => {
    apiFetch.mockResolvedValue({ data: { sent: true }, status: 200 })
    await requestOtp('+919876543210')
    expect(apiFetch).toHaveBeenCalledWith('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '+919876543210' }),
    })
  })

  it('verifyOtp returns isNewUser=true on a 201', async () => {
    apiFetch.mockResolvedValue({ data: { user: { id: 'u1' } }, status: 201 })
    const out = await verifyOtp('id-token-xyz')
    expect(apiFetch).toHaveBeenCalledWith('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ idToken: 'id-token-xyz' }),
    })
    expect(out).toEqual({ user: { id: 'u1' }, isNewUser: true })
  })

  it('verifyOtp returns isNewUser=false on a 200', async () => {
    apiFetch.mockResolvedValue({ data: { user: { id: 'u1' } }, status: 200 })
    const out = await verifyOtp('id-token-xyz')
    expect(out.isNewUser).toBe(false)
  })

  it('logout + refreshSession hit their endpoints', async () => {
    apiFetch.mockResolvedValue({ data: {}, status: 200 })
    await logout()
    await refreshSession()
    expect(apiFetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' })
    expect(apiFetch).toHaveBeenCalledWith('/auth/refresh', { method: 'POST' })
  })
})

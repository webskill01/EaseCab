import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { getMembership } from '../subscriptionApi'

beforeEach(() => vi.clearAllMocks())

describe('getMembership', () => {
  it('GETs /subscription/me and returns the status payload', async () => {
    apiFetch.mockResolvedValue({ data: { status: 'trial', isActive: true, trialExpiresAt: 't', expiresAt: null } })
    const out = await getMembership()
    expect(apiFetch).toHaveBeenCalledWith('/subscription/me')
    expect(out.status).toBe('trial')
    expect(out.isActive).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { getProfile, updateProfile, attachImage } from '../profileApi'

beforeEach(() => vi.clearAllMocks())

describe('profileApi', () => {
  it('getProfile unwraps data', async () => {
    apiFetch.mockResolvedValue({ data: { id: 'u1', name: 'A' } })
    expect(await getProfile()).toEqual({ id: 'u1', name: 'A' })
    expect(apiFetch).toHaveBeenCalledWith('/me/profile')
  })
  it('updateProfile PATCHes the body', async () => {
    apiFetch.mockResolvedValue({ data: { id: 'u1' } })
    await updateProfile({ name: 'A', bio: 'b' })
    expect(apiFetch).toHaveBeenCalledWith('/me/profile', { method: 'PATCH', body: JSON.stringify({ name: 'A', bio: 'b' }) })
  })
  it('attachImage POSTs purpose+key', async () => {
    apiFetch.mockResolvedValue({ data: { purpose: 'dp' } })
    await attachImage({ purpose: 'dp', key: 'k1' })
    expect(apiFetch).toHaveBeenCalledWith('/me/uploads', { method: 'POST', body: JSON.stringify({ purpose: 'dp', key: 'k1' }) })
  })
})

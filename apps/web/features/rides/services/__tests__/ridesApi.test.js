import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { listRides, contactRide, listVerifiedRides, contactVerifiedRide } from '../ridesApi'

beforeEach(() => vi.clearAllMocks())

describe('ridesApi', () => {
  it('listRides builds the query from cursor + cityIds + limit', async () => {
    apiFetch.mockResolvedValue({ data: { rides: [{ id: 'r1' }] }, meta: { nextCursor: 'cur2' } })
    const out = await listRides({ cursor: 'cur1', cityIds: ['c9', 'c7'], limit: 20 })
    expect(apiFetch).toHaveBeenCalledWith('/rides?limit=20&cursor=cur1&cityIds=c9%2Cc7')
    expect(out).toEqual({ rides: [{ id: 'r1' }], nextCursor: 'cur2' })
  })

  it('listRides omits empty params and defaults nextCursor to null', async () => {
    apiFetch.mockResolvedValue({ data: { rides: [] }, meta: {} })
    const out = await listRides()
    expect(apiFetch).toHaveBeenCalledWith('/rides')
    expect(out.nextCursor).toBeNull()
  })

  it('contactRide POSTs to the reveal endpoint and returns the phone payload', async () => {
    apiFetch.mockResolvedValue({ data: { phoneNumber: '+919876543210', contactedAt: 't' } })
    const out = await contactRide('r1')
    expect(apiFetch).toHaveBeenCalledWith('/rides/r1/contact', { method: 'POST' })
    expect(out.phoneNumber).toBe('+919876543210')
  })

  it('listVerifiedRides hits /posted-rides and unwraps posts', async () => {
    apiFetch.mockResolvedValue({ data: { posts: [{ id: 'p1' }] }, meta: { nextCursor: null } })
    const out = await listVerifiedRides({ cityIds: ['c9'] })
    expect(apiFetch).toHaveBeenCalledWith('/posted-rides?cityIds=c9')
    expect(out).toEqual({ posts: [{ id: 'p1' }], nextCursor: null })
  })

  it('contactVerifiedRide POSTs to the posted-rides reveal endpoint', async () => {
    apiFetch.mockResolvedValue({ data: { phoneNumber: '+91x', contactedAt: null } })
    await contactVerifiedRide('p1')
    expect(apiFetch).toHaveBeenCalledWith('/posted-rides/p1/contact', { method: 'POST' })
  })
})

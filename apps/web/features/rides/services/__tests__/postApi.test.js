import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { createPost, parsePost } from '../postApi'

beforeEach(() => vi.clearAllMocks())

describe('createPost', () => {
  it('POSTs the create body and returns data', async () => {
    apiFetch.mockResolvedValue({ data: { id: 'p1', vehicleType: 'Innova' } })
    const body = { fromCityId: 'c1', toCityRaw: 'Pinjore', phone: '+919876543210' }
    const out = await createPost(body)
    expect(apiFetch).toHaveBeenCalledWith('/posted-rides', { method: 'POST', body: JSON.stringify(body) })
    expect(out).toEqual({ id: 'p1', vehicleType: 'Innova' })
  })
})

describe('parsePost', () => {
  it('POSTs { text } to /parse and returns the draft', async () => {
    apiFetch.mockResolvedValue({ data: { fromCityRaw: 'Delhi', phone: '+919876543210' } })
    const out = await parsePost('Delhi to Chd 9876543210')
    expect(apiFetch).toHaveBeenCalledWith('/posted-rides/parse', { method: 'POST', body: JSON.stringify({ text: 'Delhi to Chd 9876543210' }) })
    expect(out).toEqual({ fromCityRaw: 'Delhi', phone: '+919876543210' })
  })
})

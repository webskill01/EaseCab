import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { listBlocks, unblockUser } from '../blocksApi'

beforeEach(() => vi.clearAllMocks())

describe('listBlocks', () => {
  it('GETs /blocks and returns the blocks array', async () => {
    apiFetch.mockResolvedValue({ data: { blocks: [{ id: 'b1', blockedId: 'u2' }] } })
    const out = await listBlocks()
    expect(apiFetch).toHaveBeenCalledWith('/blocks')
    expect(out).toHaveLength(1)
    expect(out[0].blockedId).toBe('u2')
  })
})

describe('unblockUser', () => {
  it('DELETEs /blocks/:id', async () => {
    apiFetch.mockResolvedValue({ data: { blockedId: 'u2' } })
    await unblockUser('u2')
    expect(apiFetch).toHaveBeenCalledWith('/blocks/u2', { method: 'DELETE' })
  })
})

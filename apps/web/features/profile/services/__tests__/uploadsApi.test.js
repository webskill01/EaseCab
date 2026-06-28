import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { presignUpload, uploadToR2, DP_MAX_BYTES, dpPrecheck } from '../uploadsApi'

beforeEach(() => { vi.clearAllMocks(); global.fetch = vi.fn() })

describe('uploadsApi', () => {
  it('presignUpload POSTs purpose+contentType', async () => {
    apiFetch.mockResolvedValue({ data: { url: 'u', key: 'k', publicUrl: 'p' } })
    const r = await presignUpload({ purpose: 'dp', contentType: 'image/png' })
    expect(apiFetch).toHaveBeenCalledWith('/uploads/presign', { method: 'POST', body: JSON.stringify({ purpose: 'dp', contentType: 'image/png' }) })
    expect(r.key).toBe('k')
  })
  it('uploadToR2 PUTs the file body with its Content-Type to the presigned url', async () => {
    global.fetch.mockResolvedValue({ ok: true })
    const file = new File(['x'], 'p.png', { type: 'image/png' })
    await uploadToR2({ url: 'https://r2', file })
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('https://r2')
    expect(opts.method).toBe('PUT')
    expect(opts.body).toBe(file)
    expect(opts.headers['Content-Type']).toBe('image/png')
  })
  it('uploadToR2 throws on non-ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403 })
    await expect(uploadToR2({ url: 'u', file: new File(['x'], 'p.png', { type: 'image/png' }) })).rejects.toThrow()
  })
  it('uploadToR2 skips the network PUT when stub is true (local R2 stub)', async () => {
    await uploadToR2({ url: 'https://cdn.easecab.com/easecab-uploads', file: new File(['x'], 'p.png', { type: 'image/png' }), stub: true })
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it('dpPrecheck rejects oversize and bad mime', () => {
    expect(dpPrecheck({ size: DP_MAX_BYTES + 1, type: 'image/png' })).toBe('dp.tooBig')
    expect(dpPrecheck({ size: 10, type: 'image/gif' })).toBe('dp.badType')
    expect(dpPrecheck({ size: 10, type: 'image/png' })).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
vi.mock('../../services/uploadsApi', async () => {
  const actual = await vi.importActual('../../services/uploadsApi')
  return { ...actual, presignUpload: vi.fn(), uploadToR2: vi.fn() }
})
import { presignUpload, uploadToR2 } from '../../services/uploadsApi'
import { useDpUpload } from '../useDpUpload'

const png = (size = 100) => new File([new Uint8Array(size)], 'p.png', { type: 'image/png' })
beforeEach(() => vi.clearAllMocks())

describe('useDpUpload', () => {
  it('presigns, uploads, resolves {key, previewUrl}', async () => {
    presignUpload.mockResolvedValue({ url: 'https://r2', fields: {}, key: 'k1', publicUrl: 'https://cdn/k1' })
    uploadToR2.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDpUpload())
    let out
    await act(async () => { out = await result.current.upload(png()) })
    expect(out).toEqual({ key: 'k1', previewUrl: 'https://cdn/k1' })
    expect(presignUpload).toHaveBeenCalledWith({ purpose: 'dp', contentType: 'image/png' })
  })
  it('rejects an oversize file before presigning', async () => {
    const { result } = renderHook(() => useDpUpload())
    await act(async () => { await result.current.upload(png(6 * 1024 * 1024)) })
    expect(result.current.errorKey).toBe('dp.tooBig')
    expect(presignUpload).not.toHaveBeenCalled()
  })
  it('surfaces an upload failure', async () => {
    presignUpload.mockResolvedValue({ url: 'u', fields: {}, key: 'k', publicUrl: 'p' })
    uploadToR2.mockRejectedValue(new Error('403'))
    const { result } = renderHook(() => useDpUpload())
    await act(async () => { await result.current.upload(png()) })
    await waitFor(() => expect(result.current.errorKey).toBe('dp.failed'))
  })
})

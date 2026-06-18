import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/features/profile/services/uploadsApi', () => ({
  presignUpload: vi.fn(),
  uploadToR2: vi.fn(),
  kycPrecheck: vi.fn(),
}))
vi.mock('@/features/profile/services/profileApi', () => ({ attachImage: vi.fn() }))
import { presignUpload, uploadToR2, kycPrecheck } from '@/features/profile/services/uploadsApi'
import { attachImage } from '@/features/profile/services/profileApi'
import { useKycUpload } from '../useKycUpload'

const file = { type: 'application/pdf', size: 1000 }

beforeEach(() => vi.clearAllMocks())

describe('useKycUpload', () => {
  it('rejects a bad file via precheck without presigning', async () => {
    kycPrecheck.mockReturnValue('driver.docTooBig')
    const { result } = renderHook(() => useKycUpload('rc_image'))
    let ok
    await act(async () => { ok = await result.current.upload(file) })
    expect(ok).toBe(false)
    expect(result.current.errorKey).toBe('driver.docTooBig')
    expect(presignUpload).not.toHaveBeenCalled()
  })

  it('presigns, uploads, and attaches the key for its purpose on success', async () => {
    kycPrecheck.mockReturnValue(null)
    presignUpload.mockResolvedValue({ url: 'u', fields: {}, key: 'kyc/u1/x.pdf', stub: true })
    uploadToR2.mockResolvedValue(undefined)
    attachImage.mockResolvedValue({})
    const { result } = renderHook(() => useKycUpload('licence_image'))
    let ok
    await act(async () => { ok = await result.current.upload(file) })
    expect(ok).toBe(true)
    expect(presignUpload).toHaveBeenCalledWith({ purpose: 'licence_image', contentType: 'application/pdf' })
    expect(attachImage).toHaveBeenCalledWith({ purpose: 'licence_image', key: 'kyc/u1/x.pdf' })
    expect(result.current.done).toBe(true)
  })
})

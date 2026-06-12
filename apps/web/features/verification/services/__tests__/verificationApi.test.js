import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }))
import { apiFetch } from '@/lib/api/client'
import { startAadhaar, verifyAadhaar, verifyDl, verifyRc, getVerificationStatus } from '../verificationApi'

beforeEach(() => vi.clearAllMocks())

describe('verificationApi', () => {
  it('startAadhaar posts the number, returns clientId', async () => {
    apiFetch.mockResolvedValue({ data: { clientId: 'c1' } })
    expect(await startAadhaar('123456789012')).toEqual({ clientId: 'c1' })
    expect(apiFetch).toHaveBeenCalledWith('/verification/aadhaar/otp', { method: 'POST', body: JSON.stringify({ aadhaarNumber: '123456789012' }) })
  })
  it('verifyAadhaar posts clientId+otp', async () => {
    apiFetch.mockResolvedValue({ data: { verified: true, name: 'A' } })
    await verifyAadhaar({ clientId: 'c1', otp: '123456' })
    expect(apiFetch).toHaveBeenCalledWith('/verification/aadhaar/verify', { method: 'POST', body: JSON.stringify({ clientId: 'c1', otp: '123456' }) })
  })
  it('verifyDl + verifyRc + getVerificationStatus hit the right paths', async () => {
    apiFetch.mockResolvedValue({ data: {} })
    await verifyDl({ dlNumber: 'PB1020200012345', dob: '1990-05-20' })
    expect(apiFetch).toHaveBeenCalledWith('/verification/dl', { method: 'POST', body: JSON.stringify({ dlNumber: 'PB1020200012345', dob: '1990-05-20' }) })
    await verifyRc('PB10AB1234')
    expect(apiFetch).toHaveBeenCalledWith('/verification/rc', { method: 'POST', body: JSON.stringify({ rcNumber: 'PB10AB1234' }) })
    await getVerificationStatus()
    expect(apiFetch).toHaveBeenCalledWith('/verification/me')
  })
})

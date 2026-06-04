import { describe, it, expect } from 'vitest'
import { errorKey } from '../errorKey'

describe('errorKey', () => {
  it('maps API codes to auth error sub-keys', () => {
    expect(errorKey({ code: 'RATE_LIMITED' })).toBe('errors.rateLimited')
    expect(errorKey({ code: 'AUTH_REQUIRED' })).toBe('errors.invalidOtp')
    expect(errorKey({ code: 'NETWORK_ERROR' })).toBe('errors.network')
  })
  it('maps Firebase codes', () => {
    expect(errorKey({ code: 'auth/invalid-verification-code' })).toBe('errors.invalidOtp')
    expect(errorKey({ code: 'auth/code-expired' })).toBe('errors.codeExpired')
  })
  it('falls back to generic for unknown/missing', () => {
    expect(errorKey({ code: 'WHATEVER' })).toBe('errors.generic')
    expect(errorKey(undefined)).toBe('errors.generic')
  })
})

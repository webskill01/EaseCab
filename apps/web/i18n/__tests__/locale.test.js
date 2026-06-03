import { describe, it, expect, vi, afterEach } from 'vitest'

const cookieGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ get: cookieGet }),
}))

import { getUserLocale, LOCALES, DEFAULT_LOCALE } from '../locale'

afterEach(() => cookieGet.mockReset())

describe('getUserLocale', () => {
  it('exposes the four supported locales', () => {
    expect(LOCALES).toEqual(['en', 'pa', 'hi', 'hinglish'])
    expect(DEFAULT_LOCALE).toBe('en')
  })

  it('returns the cookie locale when valid', () => {
    cookieGet.mockReturnValue({ value: 'pa' })
    expect(getUserLocale()).toBe('pa')
  })

  it('falls back to the default for an unknown/missing cookie', () => {
    cookieGet.mockReturnValue(undefined)
    expect(getUserLocale()).toBe('en')
    cookieGet.mockReturnValue({ value: 'fr' })
    expect(getUserLocale()).toBe('en')
  })
})

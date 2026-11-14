import { describe, it, expect, vi, afterEach } from 'vitest'

const cookieGet = vi.fn()
const headerGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ get: cookieGet }),
  headers: () => ({ get: headerGet }),
}))

import { getUserLocale, LOCALES, DEFAULT_LOCALE } from '../locale'

afterEach(() => { cookieGet.mockReset(); headerGet.mockReset() })

describe('getUserLocale', () => {
  it('exposes the four supported locales', () => {
    expect(LOCALES).toEqual(['en', 'pa', 'hi', 'hinglish'])
    expect(DEFAULT_LOCALE).toBe('hinglish')
  })

  it('returns the cookie locale when valid', async () => {
    cookieGet.mockReturnValue({ value: 'pa' })
    expect(await getUserLocale()).toBe('pa')
  })

  it('no valid cookie: English (or unknown) phones get Hinglish', async () => {
    cookieGet.mockReturnValue(undefined)
    headerGet.mockReturnValue('en-IN,en;q=0.9')
    expect(await getUserLocale()).toBe('hinglish')
    cookieGet.mockReturnValue({ value: 'fr' })
    headerGet.mockReturnValue(null)
    expect(await getUserLocale()).toBe('hinglish')
  })

  it('no cookie: Hindi / Punjabi phones get their own script', async () => {
    cookieGet.mockReturnValue(undefined)
    headerGet.mockReturnValue('hi-IN,hi;q=0.9,en;q=0.8')
    expect(await getUserLocale()).toBe('hi')
    headerGet.mockReturnValue('pa-IN')
    expect(await getUserLocale()).toBe('pa')
  })

  it('an old English pick (no marker) moves to Hinglish', async () => {
    cookieGet.mockImplementation((k) => (k === 'locale' ? { value: 'en' } : undefined))
    expect(await getUserLocale()).toBe('hinglish')
  })

  it('a fresh English pick (with marker) still wins', async () => {
    cookieGet.mockReturnValue({ value: 'en' })
    headerGet.mockReturnValue('hi-IN')
    expect(await getUserLocale()).toBe('en')
  })
})

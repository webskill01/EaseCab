import { describe, it, expect } from 'vitest'
import { getQueryClient } from '../queryClient'

describe('getQueryClient', () => {
  it('returns the same instance on repeated calls in the browser', () => {
    expect(getQueryClient()).toBe(getQueryClient())
  })

  it('does not retry 4xx errors', () => {
    const { retry } = getQueryClient().getDefaultOptions().queries
    expect(retry(0, { status: 401 })).toBe(false)
    expect(retry(0, { status: 404 })).toBe(false)
  })

  it('retries non-4xx errors up to 2 times', () => {
    const { retry } = getQueryClient().getDefaultOptions().queries
    expect(retry(0, { status: 500 })).toBe(true)
    expect(retry(2, { status: 500 })).toBe(false)
  })
})

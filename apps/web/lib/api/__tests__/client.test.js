import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, setOnSessionExpired } from '../client'
import { ApiError } from '../ApiError'

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body }
}

const unauthorized = () =>
  jsonResponse({ success: false, error: { code: 'AUTH_REQUIRED', message: 'nope' } }, { ok: false, status: 401 })
const ok = (data) => jsonResponse({ success: true, data })

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setOnSessionExpired(null)
})

describe('apiFetch', () => {
  it('prefixes the base URL + /api/v1 and sends credentials', async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true, data: { id: 1 } }))
    await apiFetch('/rides')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/rides',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('unwraps the envelope and returns { data, meta, status }', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ success: true, data: [{ id: 1 }], meta: { total: 1 } }, { status: 201 }),
    )
    const result = await apiFetch('/rides')
    expect(result).toEqual({ data: [{ id: 1 }], meta: { total: 1 }, status: 201 })
  })

  it('throws ApiError carrying code + status when success is false', async () => {
    fetch.mockResolvedValue(
      jsonResponse(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'nope' } },
        { ok: false, status: 401 },
      ),
    )
    await expect(apiFetch('/rides')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'AUTH_REQUIRED',
      status: 401,
    })
  })

  it('throws ApiError NETWORK_ERROR when fetch rejects', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiFetch('/rides')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    })
  })
})

describe('apiFetch — 401 auto-refresh', () => {
  it('on a 401 refreshes once and retries the original request', async () => {
    fetch
      .mockResolvedValueOnce(unauthorized()) // original → expired access token
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { refreshed: true } })) // /auth/refresh ok
      .mockResolvedValueOnce(ok({ id: 7 })) // retry → success
    const result = await apiFetch('/rides')
    expect(result.data).toEqual({ id: 7 })
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:4000/api/v1/auth/refresh')
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST', credentials: 'include' })
  })

  it('when the refresh fails it calls the session-expired handler and throws', async () => {
    const onExpired = vi.fn()
    setOnSessionExpired(onExpired)
    fetch
      .mockResolvedValueOnce(unauthorized()) // original
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // refresh fails
    await expect(apiFetch('/rides')).rejects.toMatchObject({ code: 'AUTH_REQUIRED', status: 401 })
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('does NOT refresh on a 401 from an /auth/* path (no recursion / no false refresh)', async () => {
    fetch.mockResolvedValue(unauthorized())
    await expect(apiFetch('/auth/verify-otp', { method: 'POST' })).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('collapses concurrent 401s into a single refresh (single-flight)', async () => {
    let refreshCalls = 0
    fetch.mockImplementation((url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
      }
      return Promise.resolve(unauthorized())
    })
    const results = await Promise.allSettled([apiFetch('/rides'), apiFetch('/me/contacted')])
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(refreshCalls).toBe(1)
  })
})

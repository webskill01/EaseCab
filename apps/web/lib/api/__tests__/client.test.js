import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from '../client'
import { ApiError } from '../ApiError'

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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

  it('unwraps the envelope and returns { data, meta }', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ success: true, data: [{ id: 1 }], meta: { total: 1 } }),
    )
    const result = await apiFetch('/rides')
    expect(result).toEqual({ data: [{ id: 1 }], meta: { total: 1 } })
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

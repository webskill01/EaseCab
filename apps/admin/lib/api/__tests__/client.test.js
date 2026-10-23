import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch } from '../client'

const reply = (status, body) => ({ ok: status < 400, status, json: async () => body })
const OK = { success: true, data: { x: 1 } }
const DENIED = { success: false, error: { code: 'AUTH_REQUIRED', message: 'no' } }

afterEach(() => vi.unstubAllGlobals())

describe('apiFetch session refresh', () => {
  it('renews an expired access cookie once and retries', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(reply(401, DENIED))
      .mockResolvedValueOnce(reply(200, { success: true, data: {} }))
      .mockResolvedValueOnce(reply(200, OK))
    vi.stubGlobal('fetch', fetch)
    await expect(apiFetch('/admin/stats')).resolves.toMatchObject({ data: { x: 1 } })
    expect(fetch.mock.calls[1][0]).toMatch(/\/admin\/auth\/refresh$/)
  })

  it('gives up when the refresh cookie is gone too', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(reply(401, DENIED)).mockResolvedValueOnce(reply(401, DENIED)))
    await expect(apiFetch('/admin/auth/me')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })

  it('never refreshes on a failed login', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(reply(401, DENIED))
    vi.stubGlobal('fetch', fetch)
    await expect(apiFetch('/admin/auth/login', { method: 'POST' })).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

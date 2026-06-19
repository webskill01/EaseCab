import { describe, it, expect, afterEach, vi } from 'vitest'
import { registerAppShellSW } from '../swClient'

afterEach(() => {
  delete process.env.NEXT_PUBLIC_E2E
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('registerAppShellSW', () => {
  it('no-ops in E2E mode', async () => {
    process.env.NEXT_PUBLIC_E2E = 'true'
    expect(await registerAppShellSW()).toBeNull()
  })

  it('no-ops when service workers are unsupported (jsdom)', async () => {
    expect(await registerAppShellSW()).toBeNull()
  })

  it('in development, unregisters leftover SWs + clears caches and does NOT register', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const unregister = vi.fn().mockResolvedValue(true)
    const register = vi.fn()
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]), register },
    })
    const cacheDelete = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue(['easecab-shell-v1']), delete: cacheDelete })

    expect(await registerAppShellSW()).toBeNull()
    expect(unregister).toHaveBeenCalledOnce()
    expect(cacheDelete).toHaveBeenCalledWith('easecab-shell-v1')
    expect(register).not.toHaveBeenCalled()
  })

  it('in production, registers the app-shell SW', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const reg = { scope: '/' }
    const register = vi.fn().mockResolvedValue(reg)
    vi.stubGlobal('navigator', { serviceWorker: { register } })

    expect(await registerAppShellSW()).toBe(reg)
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })
})

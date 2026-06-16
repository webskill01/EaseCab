import { describe, it, expect, afterEach } from 'vitest'
import { registerAppShellSW } from '../swClient'

afterEach(() => {
  delete process.env.NEXT_PUBLIC_E2E
})

describe('registerAppShellSW', () => {
  it('no-ops in E2E mode', async () => {
    process.env.NEXT_PUBLIC_E2E = 'true'
    expect(await registerAppShellSW()).toBeNull()
  })

  it('no-ops when service workers are unsupported (jsdom)', async () => {
    expect(await registerAppShellSW()).toBeNull()
  })
})

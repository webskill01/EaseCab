import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

const { register } = vi.hoisted(() => ({ register: vi.fn().mockResolvedValue(null) }))
vi.mock('../../services/swClient', () => ({ registerAppShellSW: register }))

import { PwaRegister } from '../PwaRegister'

describe('PwaRegister', () => {
  it('registers the service worker once on mount', () => {
    render(<PwaRegister />)
    expect(register).toHaveBeenCalledTimes(1)
  })
})

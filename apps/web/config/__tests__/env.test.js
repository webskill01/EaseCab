import { describe, it, expect } from 'vitest'
import { env } from '../env'

describe('web env', () => {
  it('exposes a validated NEXT_PUBLIC_API_URL', () => {
    // vitest.config.js sets this to http://localhost:4000
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://localhost:4000')
  })
})

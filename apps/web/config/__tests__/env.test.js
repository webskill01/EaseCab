import { describe, it, expect } from 'vitest'
import { env } from '../env'

describe('web env', () => {
  it('exposes a validated NEXT_PUBLIC_API_URL', () => {
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://localhost:4000')
  })

  it('exposes the Firebase client config', () => {
    expect(env.NEXT_PUBLIC_FIREBASE_API_KEY).toBe('test-api-key')
    expect(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN).toBe('test.firebaseapp.com')
    expect(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBe('test-project')
  })
})

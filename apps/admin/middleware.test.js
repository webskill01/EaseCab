import { describe, it, expect } from 'vitest'
import { middleware, config } from './middleware'

const req = (hasSession) => ({
  url: 'http://localhost:3001/verifications',
  cookies: { get: (name) => (hasSession && name === 'ec_admin_rt' ? { value: 'tok' } : undefined) },
})

describe('admin middleware route-gate (M2)', () => {
  it('redirects to /login when the admin session cookie is absent', () => {
    const res = middleware(req(false))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3001/login')
  })

  it('passes through when the admin session cookie is present', () => {
    const res = middleware(req(true))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('excludes /login and static assets from the matcher', () => {
    const matcher = config.matcher[0]
    const re = new RegExp(`^${matcher}$`)
    expect(re.test('/login')).toBe(false)
    expect(re.test('/_next/static/chunk.js')).toBe(false)
    expect(re.test('/favicon.ico')).toBe(false)
    expect(re.test('/verifications')).toBe(true)
    expect(re.test('/')).toBe(true)
  })
})

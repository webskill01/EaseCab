import { describe, it, expect } from 'vitest'
import nextConfig from './next.config.js'

describe('admin security headers (M1)', () => {
  it('applies a catch-all headers rule', async () => {
    const rules = await nextConfig.headers()
    expect(rules).toHaveLength(1)
    expect(rules[0].source).toBe('/:path*')
  })

  it('sets the core hardening headers', async () => {
    const [{ headers }] = await nextConfig.headers()
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]))
    expect(byKey['X-Frame-Options']).toBe('DENY')
    expect(byKey['X-Content-Type-Options']).toBe('nosniff')
    expect(byKey['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(byKey['Strict-Transport-Security']).toMatch(/max-age=\d+/)
    expect(byKey['Permissions-Policy']).toContain('geolocation=()')
  })

  it('ships a CSP that denies framing and restricts default-src to self', async () => {
    const [{ headers }] = await nextConfig.headers()
    const csp = headers.find((h) => h.key === 'Content-Security-Policy').value
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('connect-src')
  })

  it("allows 'unsafe-eval' in development so Next dev/HMR can hydrate", async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      const [{ headers }] = await nextConfig.headers()
      const csp = headers.find((h) => h.key === 'Content-Security-Policy').value
      expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    } finally {
      process.env.NODE_ENV = prev
    }
  })

  it("forbids 'unsafe-eval' in production (the deployed policy stays strict)", async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const [{ headers }] = await nextConfig.headers()
      const csp = headers.find((h) => h.key === 'Content-Security-Policy').value
      expect(csp).toContain("script-src 'self' 'unsafe-inline'")
      expect(csp).not.toContain("'unsafe-eval'")
    } finally {
      process.env.NODE_ENV = prev
    }
  })
})

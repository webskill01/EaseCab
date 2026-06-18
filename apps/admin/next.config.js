/** @type {import('next').NextConfig} */

// Connect targets the admin SPA needs: the API origin (XHR/fetch) plus self.
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || ''

// Content-Security-Policy for the admin panel (security-review M1). 'unsafe-inline'
// is required for styles (Tailwind/Next inject inline <style>) and for Next 14's
// inline hydration bootstrap script — without per-request nonces this is the
// tightest workable policy. No external script/style/frame sources are allowed.
//
// Computed per call so NODE_ENV is read at request time: Next's dev server + HMR
// evaluate bundled code with eval()/new Function(), so DEVELOPMENT must allow
// 'unsafe-eval' (without it the client bundle throws, hydration never completes, and
// interactive forms fall back to native submits). A production `next build` emits no
// eval, so the DEPLOYED policy stays strict — 'unsafe-eval' is never sent in prod.
function buildCsp() {
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'"
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

function buildSecurityHeaders() {
  return [
    { key: 'Content-Security-Policy', value: buildCsp() },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  ]
}

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: buildSecurityHeaders() }]
  },
}

module.exports = nextConfig

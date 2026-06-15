import { NextResponse } from 'next/server'

// Mirrors shared ADMIN_AUTH_COOKIES.REFRESH_TOKEN — the admin app doesn't bundle
// @easecab/shared (like apps/web), so the name is duplicated here with this note.
// We gate on the 8h REFRESH cookie (the real session anchor) rather than the 15m
// access cookie, so a still-valid session isn't bounced to /login every 15 minutes.
const ADMIN_REFRESH_COOKIE = 'ec_admin_rt'

/**
 * First-layer route gate for the admin panel (security-review M2). Runs on every
 * protected route before the page renders; if no admin session cookie is present it
 * redirects to /login server-side — defense-in-depth ahead of the client AdminGuard
 * (which probes /me) and the API's requireAdmin (the real authorization boundary).
 * In production the API sets the admin cookie with domain `.easecab.com` so it
 * reaches admin.easecab.com and is readable here.
 */
export function middleware(request) {
  if (!request.cookies.get(ADMIN_REFRESH_COOKIE)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

// Skip /login itself plus Next internals and static assets — only guard real pages.
export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico|.*\\.).*)'],
}

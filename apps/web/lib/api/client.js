import { env } from '@/config/env'
import { ApiError } from './ApiError'

const BASE_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1`

/**
 * Single-flight access-token refresh. The access cookie is short-lived (15m); when
 * it expires, a screen's worth of queries 401 at once. We collapse that burst into
 * ONE POST /auth/refresh (which rotates both cookies) rather than a stampede.
 */
let refreshInFlight = null

/**
 * Optional global hook. AuthGuard registers a redirect-to-login here so a hard
 * refresh failure mid-session (e.g. the 30d refresh token finally expiring, or a
 * revoked session) bounces the user to /login instead of every request silently 401ing.
 */
let onSessionExpired = null

/** Register (or clear, with `null`) the handler invoked when the session can't be refreshed. */
export function setOnSessionExpired(fn) {
  onSessionExpired = fn
}

/**
 * POST /auth/refresh once, sharing the in-flight promise across concurrent callers.
 * Resolves `true` when the cookies were rotated, `false` otherwise. Never throws.
 * @returns {Promise<boolean>}
 */
function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

/**
 * Calls the EaseCab API with httpOnly-cookie auth (CLAUDE.md §6), unwrapping the
 * standard `{ success, data, error, meta }` envelope. On a 401 (expired access
 * token) it transparently refreshes once and retries the request a single time;
 * if the refresh also fails it invokes the session-expired handler.
 * @param {string} path - path beginning with `/`, relative to /api/v1
 * @param {RequestInit} [options] - fetch options (method, body, headers, signal)
 * @param {boolean} [_retried] - internal: marks the post-refresh retry (no second refresh)
 * @returns {Promise<{ data: unknown, meta?: unknown, status: number }>}
 * @throws {ApiError} on transport failure or a non-success envelope
 */
export async function apiFetch(path, options = {}, _retried = false) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Network request failed', 0)
  }

  // Access token expired? Refresh once, then retry the original request a single time.
  // Skip for /auth/* (refresh/verify/send own their 401s — refreshing there would recurse
  // or paper over a genuinely bad OTP).
  if (res.status === 401 && !_retried && !path.startsWith('/auth/')) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return apiFetch(path, options, true)
    if (onSessionExpired) onSessionExpired()
  }

  let body
  try {
    body = await res.json()
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Malformed server response', res.status)
  }

  if (!res.ok || !body?.success) {
    const code = body?.error?.code ?? 'INTERNAL_ERROR'
    const message = body?.error?.message ?? 'Request failed'
    throw new ApiError(code, message, res.status)
  }

  return { data: body.data, meta: body.meta, status: res.status }
}

import { env } from '@/config/env'
import { ApiError } from './ApiError'

const BASE_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1`

/**
 * Calls the EaseCab API with httpOnly-cookie auth (CLAUDE.md §6), unwrapping the
 * standard `{ success, data, error, meta }` envelope.
 * @param {string} path - path beginning with `/`, relative to /api/v1
 * @param {RequestInit} [options] - fetch options (method, body, headers, signal)
 * @returns {Promise<{ data: unknown, meta?: unknown, status: number }>}
 * @throws {ApiError} on transport failure or a non-success envelope
 */
export async function apiFetch(path, options = {}) {
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

import { apiFetch } from '@/lib/api/client'

/**
 * Auth API calls (CLAUDE.md §4 service layer, client side). All hit the Step-9
 * backend; httpOnly cookies are set/cleared by the server (apiFetch sends
 * credentials). Never logs phone or token (§10).
 */

/**
 * Our rate-limit gate. Returns `{ channel }`: 'server' = the API already sent the SMS
 * (2Factor); anything else = the client runs the Firebase send itself.
 */
export async function requestOtp(phoneE164) {
  const { data } = await apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: phoneE164 }),
  })
  return data
}

/**
 * Verify → cookies. 201 ⇒ new user (show the trial screen).
 * @param {{ idToken: string } | { phone: string, otp: string }} proof
 */
export async function verifyOtp(proof) {
  const { data, status } = await apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(proof),
  })
  return { user: data.user, isNewUser: status === 201 }
}

/** Clear the session cookies. */
export async function logout() {
  return apiFetch('/auth/logout', { method: 'POST' })
}

/** Probe/rotate the session — used by AuthGuard. Throws ApiError when unauthed. */
export async function refreshSession() {
  return apiFetch('/auth/refresh', { method: 'POST' })
}

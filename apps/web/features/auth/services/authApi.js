import { apiFetch } from '@/lib/api/client'

/**
 * Auth API calls (CLAUDE.md §4 service layer, client side). All hit the Step-9
 * backend; httpOnly cookies are set/cleared by the server (apiFetch sends
 * credentials). Never logs phone or token (§10).
 */

/** Our rate-limit gate. The client triggers the Firebase send only after this 200. */
export async function requestOtp(phoneE164) {
  const { data } = await apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: phoneE164 }),
  })
  return data
}

/** Verify the Firebase ID token → cookies. 201 ⇒ new user (show the trial screen). */
export async function verifyOtp(idToken) {
  const { data, status } = await apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
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

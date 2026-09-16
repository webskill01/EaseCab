import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { getFirebaseAuth } from '../lib/firebaseClient'

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container'

/**
 * Firebase phone-auth boundary. `sendOtp` triggers the SMS via an invisible
 * reCAPTCHA; `confirm` exchanges the code for a Firebase ID token. In E2E mode
 * (NEXT_PUBLIC_E2E=true) Firebase is bypassed with a deterministic fake — the
 * specs network-mock our own /auth endpoints instead (reCAPTCHA can't run headless).
 *
 * Dev/testing only: NEXT_PUBLIC_FIREBASE_TEST_MODE=true sets Firebase's
 * appVerificationDisabledForTesting, which skips the reCAPTCHA challenge for
 * console-registered TEST phone numbers (fixed code, no SMS). NEVER set this in
 * production — prod builds omit the flag, so real numbers still get the (invisible)
 * reCAPTCHA that Firebase Phone Auth requires for anti-abuse.
 */
let verifier = null

/** One invisible verifier per page; Firebase resets its token after each send. */
function getVerifier() {
  const auth = getFirebaseAuth()
  if (process.env.NEXT_PUBLIC_FIREBASE_TEST_MODE === 'true') {
    auth.settings.appVerificationDisabledForTesting = true
  }
  if (!verifier) verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' })
  return { auth, verifier }
}

function resetVerifier() {
  try { verifier?.clear() } catch { /* already detached — recreated on next send */ }
  verifier = null
}

/**
 * Load + render the reCAPTCHA as soon as the login page mounts. Cold, this download
 * and challenge setup is most of the 5-6s wait after tapping "Send OTP"; warmed while
 * the user types the number, the send is just the SMS request.
 */
export function prewarmOtp() {
  if (process.env.NEXT_PUBLIC_E2E === 'true') return
  try {
    getVerifier().verifier.render().catch(resetVerifier)
  } catch {
    resetVerifier() // e.g. container not in the DOM yet — sendOtp retries from cold
  }
}

export async function sendOtp(phoneE164) {
  if (process.env.NEXT_PUBLIC_E2E === 'true') {
    return { confirm: async () => ({ user: { getIdToken: async () => 'e2e-fake-id-token' } }) }
  }
  const { auth, verifier: v } = getVerifier()
  try {
    return await signInWithPhoneNumber(auth, phoneE164, v)
  } catch (err) {
    resetVerifier() // a failed/expired widget can't be reused
    throw err
  }
}

/** Confirm the SMS code → Firebase ID token (posted to /auth/verify-otp). */
export async function confirm(confirmationResult, code) {
  const credential = await confirmationResult.confirm(code)
  return credential.user.getIdToken()
}

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
export async function sendOtp(phoneE164) {
  if (process.env.NEXT_PUBLIC_E2E === 'true') {
    return { confirm: async () => ({ user: { getIdToken: async () => 'e2e-fake-id-token' } }) }
  }
  const auth = getFirebaseAuth()
  if (process.env.NEXT_PUBLIC_FIREBASE_TEST_MODE === 'true') {
    auth.settings.appVerificationDisabledForTesting = true
  }
  const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' })
  return signInWithPhoneNumber(auth, phoneE164, verifier)
}

/** Confirm the SMS code → Firebase ID token (posted to /auth/verify-otp). */
export async function confirm(confirmationResult, code) {
  const credential = await confirmationResult.confirm(code)
  return credential.user.getIdToken()
}

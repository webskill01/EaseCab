import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { getFirebaseAuth } from '../lib/firebaseClient'

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container'

/**
 * Firebase phone-auth boundary. `sendOtp` triggers the SMS via an invisible
 * reCAPTCHA; `confirm` exchanges the code for a Firebase ID token. In E2E mode
 * (NEXT_PUBLIC_E2E=true) Firebase is bypassed with a deterministic fake — the
 * specs network-mock our own /auth endpoints instead (reCAPTCHA can't run headless).
 */
export async function sendOtp(phoneE164) {
  if (process.env.NEXT_PUBLIC_E2E === 'true') {
    return { confirm: async () => ({ user: { getIdToken: async () => 'e2e-fake-id-token' } }) }
  }
  const auth = getFirebaseAuth()
  const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' })
  return signInWithPhoneNumber(auth, phoneE164, verifier)
}

/** Confirm the SMS code → Firebase ID token (posted to /auth/verify-otp). */
export async function confirm(confirmationResult, code) {
  const credential = await confirmationResult.confirm(code)
  return credential.user.getIdToken()
}

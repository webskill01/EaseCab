/**
 * Map an ApiError/Firebase error to an `auth` i18n sub-key (used with
 * useTranslations('auth')). Keeps user-facing messages generic (§9); detail
 * stays in logs only. Never receives or echoes phone/OTP.
 * @param {{ code?: string }} [err]
 * @returns {string} sub-key like 'errors.invalidOtp'
 */
export function errorKey(err) {
  switch (err?.code) {
    case 'RATE_LIMITED':
      return 'errors.rateLimited'
    case 'AUTH_REQUIRED':
    case 'auth/invalid-verification-code':
      return 'errors.invalidOtp'
    case 'auth/code-expired':
      return 'errors.codeExpired'
    case 'NETWORK_ERROR':
      return 'errors.network'
    default:
      return 'errors.generic'
  }
}

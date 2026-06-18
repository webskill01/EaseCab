/** Verification display helpers (Step 21c). */

/** Masked Aadhaar for the private profile area — only the last 4 ever shown (§10). */
export function maskAadhaar(last4) {
  return `•••• •••• ${last4 || '••••'}`
}

/** A per-doc boolean flag → a `profile.status.*` sub-key. */
export function docState(flag) {
  return flag ? 'verified' : 'notStarted'
}

/**
 * Format Aadhaar digits as the card's 4-4-4 groups for display (#18). Strips
 * non-digits, caps at 12, joins groups with a single space. Pure — the input keeps
 * the raw digits in state and renders this.
 * @param {string} value
 * @returns {string}
 */
export function groupAadhaar(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 12)
  return (digits.match(/.{1,4}/g) || []).join(' ')
}

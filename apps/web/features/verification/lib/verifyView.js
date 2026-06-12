/** Verification display helpers (Step 21c). */

/** Masked Aadhaar for the private profile area — only the last 4 ever shown (§10). */
export function maskAadhaar(last4) {
  return `•••• •••• ${last4 || '••••'}`
}

/** A per-doc boolean flag → a `profile.status.*` sub-key. */
export function docState(flag) {
  return flag ? 'verified' : 'notStarted'
}

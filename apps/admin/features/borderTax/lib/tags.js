// Result tag (API `outcome`, shared borderTaxOutcome): only `failed` = our / govt side broke
export const OUTCOME = {
  running: ['Running', 'amber'], paid: ['Paid', 'green'], handed_off: ['Handed off', 'blue'],
  failed: ['Failed', 'red'], driver: ['Driver left', 'slate'], vehicle: ['Vehicle issue', 'amber'], cancelled: ['Cancelled', 'slate'],
}

// Specific issue under the tag (BORDER_TAX_FAILURE codes)
export const ISSUE = {
  fare_declined: 'Fare declined', captcha_timeout: 'Code not entered', captcha_wrong: 'Wrong code',
  payment_timeout: 'QR not paid', payment_failed: 'Payment failed', payment_unknown: 'Payment unknown',
  vehicle_pending: 'Pending lock', already_paid: 'Already paid', pucc_expired: 'PUC expired', fitness_expired: 'Fitness expired',
  insurance_unverified: 'Insurance unverified', seat_class_mismatch: 'Seat mismatch', road_tax_expired: 'Road tax expired',
  vehicle_not_found: 'Vehicle not found', same_state: 'Same state', no_tax_mode: 'No tax mode',
  portal_error: 'Portal error', portal_down: 'Portal down', bank_down: 'Treasury unreachable', treasury_down: 'Treasury down',
  no_handoff: 'No bank page', no_qr: 'No QR', worker_restart: 'Worker restart', state_unsupported: 'State unsupported',
}

export const issueLabel = (code) => ISSUE[code] || code

/** "QR not paid 12, Fare declined 3" — most first. */
export const issueList = (codes) => Object.entries(codes || {}).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${issueLabel(c)} ${n}`).join(', ')

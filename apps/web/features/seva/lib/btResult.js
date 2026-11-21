// Finished filing → which result card: icon/tone/title group + whether "no money charged" is certain.

/** Failure code → result group (title + icon). Unknown codes fall to 'error'. */
const GROUP = Object.freeze({
  portal_error: 'siteDown', worker_restart: 'siteDown', bank_down: 'siteDown', portal_down: 'siteDown',
  treasury_down: 'siteDown', no_qr: 'siteDown', no_handoff: 'siteDown', insurance_unverified: 'siteDown',
  road_tax_expired: 'vehicle', pucc_expired: 'vehicle', fitness_expired: 'vehicle', seat_class_mismatch: 'vehicle',
  vehicle_not_found: 'vehicle', same_state: 'vehicle', no_tax_mode: 'vehicle',
  captcha_timeout: 'code', captcha_wrong: 'code',
  vehicle_pending: 'locked',
  payment_failed: 'payment', payment_timeout: 'payment', payment_unknown: 'payment',
  fare_declined: 'declined', already_paid: 'alreadyPaid',
})

/** Groups that always stop before the payment page: nothing can have been charged. */
const NO_CHARGE = Object.freeze(['siteDown', 'vehicle', 'code', 'declined', 'alreadyPaid', 'cancelled'])
/** portal_error / worker_restart can strike after the QR showed — no promise there. */
const MAYBE_CHARGED = Object.freeze(['portal_error', 'worker_restart', 'no_handoff'])

/** @returns {{ kind: string, noCharge: boolean }} */
export function resultOf(f) {
  if (f.status === 'paid') return { kind: 'paid', noCharge: false }
  if (f.status === 'handed_off') return { kind: 'linkEnded', noCharge: false }
  if (f.status === 'cancelled') return { kind: 'cancelled', noCharge: true }
  const kind = GROUP[f.failureCode] || 'error'
  return { kind, noCharge: NO_CHARGE.includes(kind) && !MAYBE_CHARGED.includes(f.failureCode) }
}

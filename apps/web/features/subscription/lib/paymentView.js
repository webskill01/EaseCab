/**
 * Pure view helpers for the payment-history list (Step 21d). Amounts arrive in
 * paise (₹149 = 14900); dates as ISO strings.
 */

/** Paise → a ₹ string. Whole rupees show no decimals; otherwise two. */
export function formatRupees(paise) {
  const rupees = (Number(paise) || 0) / 100
  const hasFraction = rupees % 1 !== 0
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 })}`
}

/** ISO/Date → "12 Jun 2026" (en-IN). Empty string for a missing date. */
export function formatPaymentDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

/**
 * Map a payment row to its display VM.
 * @param {{ id: string, amount: number, status: string, paidAt: ?string, paymentId: ?string }} p
 */
export function paymentVM(p) {
  return {
    id: p.id,
    amount: formatRupees(p.amount),
    status: p.status,
    date: formatPaymentDate(p.paidAt),
    paymentId: p.paymentId ?? null,
  }
}

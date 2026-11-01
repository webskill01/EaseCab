/**
 * Prepaid plans — mirror of packages/shared/constants/subscription.js SUBSCRIPTION_PLANS
 * (web does not bundle @easecab/shared). Prices in rupees; keep in sync with the API,
 * which charges by plan id, so a drift here only mislabels, never mischarges.
 */
export const MONTHLY_PRICE = 149

export const PLAN_TAG = Object.freeze({ POPULAR: 'popular', BEST: 'best' })

export const PLANS = Object.freeze([
  Object.freeze({ id: 'm1', months: 1, price: 149, tag: null }),
  Object.freeze({ id: 'm3', months: 3, price: 399, tag: null }),
  Object.freeze({ id: 'm6', months: 6, price: 749, tag: PLAN_TAG.POPULAR }),
  Object.freeze({ id: 'm12', months: 12, price: 1199, tag: PLAN_TAG.BEST }),
])

export const DEFAULT_PLAN_ID = 'm1'
export const RENEW_PLAN_ID = 'm6'

/**
 * Savings vs paying monthly: MRP = months × ₹149.
 * @param {{ months: number, price: number }} plan
 * @returns {{ mrp: number, off: number, pct: number, perMonth: number }}
 */
export function planSavings(plan) {
  const mrp = plan.months * MONTHLY_PRICE
  const off = mrp - plan.price
  return { mrp, off, pct: Math.round((off / mrp) * 100), perMonth: Math.round(plan.price / plan.months) }
}

/** ₹ with Indian digit grouping (₹1,199). */
export const rupees = (n) => `₹${n.toLocaleString('en-IN')}`

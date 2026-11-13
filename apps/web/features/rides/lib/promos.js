import { Road } from '@/components/ui/icons'

/**
 * New-feature promos on the feed: a banner above the filter row for the promo's whole
 * window, plus a popup sheet at most once a day (random) until the driver opens it.
 * To promote a new feature: add an entry here + `rides.promo.<key>.*` strings in all 4
 * locales. Copy keys: title, sub, cta, popTitle, popSub. Dates are IST.
 */
export const PROMOS = Object.freeze([
  { id: 'border-tax-2026-11', key: 'borderTax', icon: Road, href: '/seva/border-tax', from: '2026-11-13T00:00:00+05:30', until: '2026-11-21T00:00:00+05:30' },
])

export const POPUP_CHANCE = 0.5 // per feed open, until shown once that IST day
const STORE = 'ec_promo'
const IST_MS = 19_800_000

/** First promo live at `now`, or null. */
export function activePromo(now = new Date(), promos = PROMOS) {
  const t = now.getTime()
  return promos.find((p) => t >= new Date(p.from).getTime() && t < new Date(p.until).getTime()) ?? null
}

/** IST calendar day, e.g. '2026-11-13'. */
export const istDay = (now) => new Date(now.getTime() + IST_MS).toISOString().slice(0, 10)

/** Popup due: not opened yet, not shown today, and the daily dice roll lands. */
export function shouldPopup(promo, state, now = new Date(), random = Math.random) {
  if (!promo || state.opened?.[promo.id]) return false
  if (state.shownDay?.[promo.id] === istDay(now)) return false
  return random() < POPUP_CHANCE
}

export function readPromoState() {
  try {
    return JSON.parse(window.localStorage.getItem(STORE) || '{}')
  } catch {
    return {} // private mode / blocked storage: popup may repeat, harmless
  }
}

/** @param {'shownDay'|'opened'} field */
export function markPromo(field, id, value) {
  const s = readPromoState()
  s[field] = { ...s[field], [id]: value }
  try {
    window.localStorage.setItem(STORE, JSON.stringify(s))
  } catch {
    // storage blocked: nothing to keep
  }
}

import { BT_STATES, BT_LIVE_STATES } from './states'

export { BT_STATES }

/** Mirrors @easecab/shared BORDER_TAX_STATUS / FINAL / SEATS / limits (test checks drift). */
export const BT_STATUS = Object.freeze({
  QUEUED: 'queued',
  FILLING: 'filling',
  AWAITING_CAPTCHA: 'awaiting_captcha',
  HANDED_OFF: 'handed_off',
  AWAITING_PAYMENT: 'awaiting_payment',
  PAID: 'paid',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
})
export const BT_FINAL = Object.freeze([BT_STATUS.HANDED_OFF, BT_STATUS.PAID, BT_STATUS.FAILED, BT_STATUS.EXPIRED, BT_STATUS.CANCELLED])
export const BT_SEATS = Object.freeze(['4+1', '5+1', '6+1', '7+1'])
/** Mirrors @easecab/shared TAX_MODE. Anything but DAYS: the govt portal sets the end date. */
export const BT_DAYS_MODE = '1'
export const isDaysMode = (f) => (f.taxMode || BT_DAYS_MODE) === BT_DAYS_MODE
export const BT_MAX_DAYS = 30
export const BT_MAX_AHEAD_DAYS = 7
export const BT_MAX_DISTANCE_KM = 2000
export const BT_VEHICLE_RE = /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/
export const BT_POLL_MS = 2000
export const BT_FAIL_VEHICLE_PENDING = 'vehicle_pending' // mirrors BORDER_TAX_FAILURE.VEHICLE_PENDING
/** Failures about the vehicle's own papers: the driver renews first, so no Try again (mirror BORDER_TAX_FAILURE). */
export const BT_FAIL_FIX_FIRST = Object.freeze(['pucc_expired', 'fitness_expired', 'road_tax_expired'])
/** No Try again either: the driver may already have paid — support checks first (mirror PAYMENT_UNKNOWN). */
export const BT_FAIL_NO_RETRY = Object.freeze([...BT_FAIL_FIX_FIRST, 'payment_unknown'])


const DAY_MS = 86_400_000
const STEP_MS = 5 * 60_000

/** Pill tone per status: in progress, done, failed, cancelled. */
export const BT_TONE = Object.freeze({
  queued: 'progress', filling: 'progress', awaiting_captcha: 'action',
  handed_off: 'done', awaiting_payment: 'action', paid: 'done', failed: 'bad', expired: 'bad', cancelled: 'muted',
})

export const isFinal = (status) => BT_FINAL.includes(status)
const RECEIPT_LOOKUP_MS = 10 * 60_000 // worker's late lookup (3 tries, 1 min apart) ends well inside this
/** Paid, receipt still being looked up by the worker — keep polling. Time-capped: a worker restart leaves the step behind. */
export const gettingReceipt = (f, now = Date.now()) =>
  f?.status === BT_STATUS.PAID && f.live?.step === 'receipt' && now - new Date(f.paidAt).getTime() < RECEIPT_LOOKUP_MS

/** Pending-lock clear status (mirrors BORDER_TAX_UNLOCK). */
export const BT_UNLOCK = Object.freeze({ QUEUED: 'queued', WAITING: 'waiting', CLEARED: 'cleared', PAID: 'paid', FAILED: 'failed' })
/** A lock clear is still to run — keep polling the filing. */
export const unlocking = (f) => [BT_UNLOCK.QUEUED, BT_UNLOCK.WAITING].includes(f?.unlock?.status)
/** Driver may tap "Clear lock": the filing hit the portal's pending lock and no clear is running / done. */
export const canUnlock = (f) => f?.failureCode === BT_FAIL_VEHICLE_PENDING && ![BT_UNLOCK.QUEUED, BT_UNLOCK.WAITING, BT_UNLOCK.CLEARED, BT_UNLOCK.PAID].includes(f.unlock?.status)

export const daysOf = (f) => Math.round((new Date(f.taxUpto) - new Date(f.taxFrom) + 60_000) / DAY_MS)

/** Ring on the preparing screen counts down from this (a filing takes ~1–3 min, longer in a queue). */
export const BT_RECEIPT_KEEP_SEC = 86_400 // mirrors BORDER_TAX.RECEIPT_KEEP_SEC: PDF deleted this long after validity ends

/** When the receipt PDF is (or was) deleted from our storage: 24h after the tax validity ends. */
export const receiptGoneAt = (f) => new Date(new Date(f.taxUpto).getTime() + BT_RECEIPT_KEEP_SEC * 1000)
/** Paid filing whose receipt PDF the worker has already deleted. */
export const receiptGone = (f, now = Date.now()) => f?.status === BT_STATUS.PAID && Boolean(f.receiptNo) && now >= receiptGoneAt(f).getTime()

export const BT_PREP_SEC = 300
export const BT_CAPTCHA_SEC = 240 // mirrors BORDER_TAX.CAPTCHA_TIMEOUT_SEC
/** Coming back to Border Tax within this long reopens the latest filing (its live state or result). */
const RESUME_MS = 15 * 60_000

const OPENED_KEY = 'ec-bt-paid-opened'
const readOpened = () => { try { return JSON.parse(localStorage.getItem(OPENED_KEY)) || [] } catch { return [] } }
/** Driver tapped Pay → the payment page doesn't pop up again on return (history card still opens it). */
export function markPayOpened(id) {
  try { localStorage.setItem(OPENED_KEY, JSON.stringify([id, ...readOpened().filter((x) => x !== id)].slice(0, 10))) } catch { /* private mode: it just reopens once */ }
}

/** Latest filing to reopen on arrival: still running, or finished just now (not one already paid from). */
export function resumable(filings, now = Date.now(), opened = readOpened()) {
  const f = filings?.[0]
  if (!f || opened.includes(f.id)) return null
  return !isFinal(f.status) || now - new Date(f.createdAt).getTime() < RESUME_MS ? f : null
}

/** The latest real fee for this form's state + border + seats, if any driver paid one recently. */
export const rateFor = (rates, { stateCd, checkpost, seats }) =>
  rates?.find((r) => r.stateCd === stateCd && (r.checkpost ?? '') === checkpost && r.seats === seats) ?? null

/** Each checklist step's share of a run: HP/HR take ~45–90s from worker pick-up to PayU (2026-11-07). */
/**
 * Preparing checklist position 0–4 (4 = all ticked), from the worker's real progress (`live.progress`
 * = portal steps done: Vahan lookup, vehicle details, tax quote); the payment page ticks the last.
 */
export function prepStep(f) {
  if (f.status === BT_STATUS.HANDED_OFF || f.status === BT_STATUS.AWAITING_PAYMENT) return 4
  if (!f.live?.started) return 0
  return Math.min(3, Number(f.live.progress) || 0)
}

/** Ring deadline: the captcha's while one waits, else BT_PREP_SEC from pick-up; null while queued. */
export function prepDeadline(f) {
  if (f.status === BT_STATUS.AWAITING_CAPTCHA && f.live?.captcha) return f.live.deadline
  return f.live?.started ? new Date(new Date(f.live.started).getTime() + BT_PREP_SEC * 1000).toISOString() : null
}

/** `<input type="datetime-local">` value (device-local, IST on Indian phones). */
export function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Default start: 15 min from now, rounded up to 5 min (the bot needs a minute or two). */
export function defaultStart(now = new Date()) {
  return toLocalInput(new Date(Math.ceil((now.getTime() + 15 * 60_000) / STEP_MS) * STEP_MS))
}

/**
 * Mirrors shared borderTaxWindow: whole 24h blocks ending one minute early (HR, HP). Calendar-day
 * states (UP: date-only portal) run to 23:59 of the last date instead.
 */
export function validUpto(startAt, days, calendarDays = false) {
  const from = new Date(startAt)
  from.setSeconds(0, 0)
  if (!calendarDays) return new Date(from.getTime() + days * DAY_MS - 60_000)
  from.setDate(from.getDate() + days - 1)
  from.setHours(23, 59)
  return from
}

export const normVehicle = (v) => v.replace(/[\s-]/g, '').toUpperCase()

/** 'PAONTA SAHIB' → 'Paonta Sahib' (portal names are upper-case). */
export const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

export function emptyForm(now = new Date()) {
  return { vehicleNo: '', seats: BT_SEATS[0], stateCd: '', checkpost: '', startAt: defaultStart(now), taxMode: BT_DAYS_MODE, days: 1, distanceKm: '', declare: false }
}

/**
 * "Try again" on a failed filing: same cab, state, border and days. The start moves to the
 * default if the old one is too close or past; the declaration is ticked afresh.
 * (Distance is not returned by the API — HR drivers re-enter it.)
 */
export function formFrom(filing, now = new Date()) {
  const base = emptyForm(now)
  const old = new Date(filing.taxFrom)
  const days = isDaysMode(filing) ? Math.round((new Date(filing.taxUpto) - old + 60_000) / DAY_MS) : 1
  const live = BT_LIVE_STATES.includes(filing.stateCd)
  return {
    ...base,
    vehicleNo: filing.vehicleNo,
    seats: filing.seats || base.seats,
    stateCd: BT_LIVE_STATES.includes(filing.stateCd) ? filing.stateCd : '', // an old filing's state may be paused
    checkpost: BT_LIVE_STATES.includes(filing.stateCd) ? filing.checkpost || '' : '',
    startAt: old > new Date(base.startAt) ? toLocalInput(old) : base.startAt,
    taxMode: live && BT_STATES[filing.stateCd].taxModes.includes(filing.taxMode) ? filing.taxMode : BT_DAYS_MODE,
    days: Math.min(Math.max(days, 1), BT_MAX_DAYS),
  }
}

/** Same rules as the server's borderTaxCreateSchema, so the button only enables for a valid body. */
/** Step 1 of the form done (valid RC + a state picked): the rest of the fields show. */
export function isStarted(f) {
  return Boolean(BT_STATES[f.stateCd]) && BT_VEHICLE_RE.test(normVehicle(f.vehicleNo))
}

/** What still blocks Pay Now, in form order (keys = seva bt.issues.*); [] when filable. */
export function btIssues(f, now = new Date()) {
  const st = BT_STATES[f.stateCd]
  const start = new Date(f.startAt).getTime()
  const ahead = start - now.getTime()
  const km = Number(f.distanceKm)
  const bad = {
    vehicle: !BT_VEHICLE_RE.test(normVehicle(f.vehicleNo)),
    seats: !BT_SEATS.includes(f.seats),
    state: !st,
    border: !st?.checkposts.includes(f.checkpost),
    mode: Boolean(st) && !st.taxModes.includes(f.taxMode),
    start: !Number.isFinite(start) || ahead < -60_000 || ahead > BT_MAX_AHEAD_DAYS * DAY_MS,
    days: isDaysMode(f) && !(f.days >= 1 && f.days <= BT_MAX_DAYS),
    distance: Boolean(st?.needsDistance) && !(Number.isInteger(km) && km >= 1 && km <= BT_MAX_DISTANCE_KM),
    declare: !f.declare,
  }
  return Object.keys(bad).filter((k) => bad[k])
}

export const isFilable = (f, now = new Date()) => btIssues(f, now).length === 0

/** Form → POST /border-tax body. Optional fields left undefined drop out of the JSON. */
export function toCreateBody(f) {
  const st = BT_STATES[f.stateCd]
  return {
    vehicleNo: normVehicle(f.vehicleNo),
    stateCd: f.stateCd,
    checkpost: f.checkpost,
    seats: f.seats,
    startAt: new Date(f.startAt).toISOString(),
    taxMode: f.taxMode,
    days: isDaysMode(f) ? f.days : undefined,
    distanceKm: st?.needsDistance ? Number(f.distanceKm) : undefined,
    declare: true,
  }
}

/** API error → seva.bt.errors key. */
export function createErrorKey(err) {
  if (err?.meta?.retryAfter) return 'busy' // govt portal busy — the form counts down retryAfter
  if (err?.code === 'RATE_LIMITED') return 'rateLimited'
  if (err?.status === 409) return 'vehicleBusy'
  return 'generic'
}

const IST = { timeZone: 'Asia/Kolkata' }
/** { date: '5 Nov 2026', time: '7:00 pm' } in IST. */
export function fmtWhen(d) {
  const x = new Date(d)
  return {
    date: x.toLocaleDateString('en-IN', { ...IST, day: 'numeric', month: 'short', year: 'numeric' }),
    time: x.toLocaleTimeString('en-IN', { ...IST, hour: 'numeric', minute: '2-digit' }),
  }
}

export const rupees = (paise) => (paise === null || paise === undefined ? null : `₹${Math.round(paise / 100)}`)

/** 125 → '2:05'. */
export const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

/**
 * Opens the official govt payment page in a NEW tab (the app stays on the filing): builds the
 * captured form and submits it.
 * Only https targets — the form came from the portal through our server, never trust it blind.
 * @param {{ method: string, action: string, fields: [string, string][] }} handoff
 */
export function submitHandoff({ method, action, fields }, doc = document) {
  if (new URL(action).protocol !== 'https:') throw new Error('handoff target must be https')
  const form = doc.createElement('form')
  form.method = method === 'GET' ? 'get' : 'post'
  form.action = action
  form.target = '_blank'
  form.style.display = 'none'
  for (const [name, value] of fields) {
    const input = doc.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  doc.body.appendChild(form)
  form.submit()
}

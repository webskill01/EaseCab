/**
 * Pure form logic for Post a Ride (Step 20) — keeps the components dumb. A "city
 * slot" is { id: string|null, name: string }; a null id means an unresolved raw
 * fragment (the create endpoint falls back to its `cityRaw` path).
 */

// Canonical vehicle labels — mirrors @easecab/shared VEHICLE_TYPES (web doesn't
// bundle the shared package; same mirroring pattern as rideView.js).
export const POST_VEHICLES = Object.freeze([
  'Sedan', 'Innova', 'SUV', 'Urbania', 'Tempo Traveller', 'Bolero', 'Bus', 'Auto',
])

/** Blank form state. */
export function emptyForm() {
  return { from: null, to: null, vehicle: '', date: '', time: '', phone: '', fare: '', notes: '' }
}

/**
 * Map a parse draft into editable form state. A resolved side keeps its id +
 * canonical name; an unresolved side shows its raw fragment with a null id.
 * @param {object} draft - from POST /posted-rides/parse
 */
export function draftToForm(draft) {
  const side = (id, name, raw) => {
    if (id) return { id, name }
    if (raw) return { id: null, name: raw }
    return null
  }
  return {
    ...emptyForm(),
    from: side(draft.fromCityId, draft.fromCityName, draft.fromCityRaw),
    to: side(draft.toCityId, draft.toCityName, draft.toCityRaw),
    vehicle: draft.vehicleType || '',
    phone: draft.phone ? String(draft.phone).replace(/^\+91/, '') : '',
  }
}

const isTenDigit = (p) => /^[6-9]\d{9}$/.test(p)

/** Local "YYYY-MM-DD" for the date input's `min` (today — no past dates). */
export function todayStr(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Is the picked date+time strictly in the future (local time)? A ride can't be
 * posted for a past slot (#8). Both parts must be present; an unparseable value
 * is treated as not-future.
 * @param {string} date - "YYYY-MM-DD"
 * @param {string} time - "HH:MM"
 * @param {number} [now] - epoch ms (injectable for tests)
 */
export function isFutureDateTime(date, time, now = Date.now()) {
  if (!date || !time) return false
  const t = new Date(`${date}T${time}`).getTime()
  if (Number.isNaN(t)) return false
  return t > now
}

/**
 * Sticky-button rule (SCREENS §5): from + to + vehicle + date + time + valid phone,
 * with the date/time in the future (#8).
 */
export function isPostable(f, now = Date.now()) {
  return Boolean(
    f.from && f.to && f.vehicle && f.date && f.time && isTenDigit(f.phone) && isFutureDateTime(f.date, f.time, now),
  )
}

/**
 * Map form state → postedRideCreateSchema body. cityId wins; else cityRaw. Empty
 * optionals are OMITTED so the schema's `.optional()` fields stay absent — an empty
 * string for rideDate/rideTime fails `z.coerce.date()`/the HH:MM regex with a 422
 * (this is the free-text "direct post" bug, #9).
 * @param {object} f - form state
 */
export function toCreateBody(f) {
  const body = { phone: `+91${f.phone}`, vehicleType: f.vehicle }
  if (f.date) body.rideDate = f.date
  if (f.time) body.rideTime = f.time
  if (f.from.id) body.fromCityId = f.from.id
  else body.fromCityRaw = f.from.name
  if (f.to.id) body.toCityId = f.to.id
  else body.toCityRaw = f.to.name
  if (f.fare !== '') body.fare = Number(f.fare)
  if (f.notes && f.notes.trim() !== '') body.notes = f.notes.trim()
  return body
}

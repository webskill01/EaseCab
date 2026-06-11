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

/** Sticky-button rule (SCREENS §5): from + to + vehicle + date + time + valid phone. */
export function isPostable(f) {
  return Boolean(f.from && f.to && f.vehicle && f.date && f.time && isTenDigit(f.phone))
}

/**
 * Map form state → postedRideCreateSchema body. cityId wins; else cityRaw. Empty
 * optionals are omitted so the schema's `.optional()` fields stay absent.
 * @param {object} f - form state (assumed postable)
 */
export function toCreateBody(f) {
  const body = { phone: `+91${f.phone}`, vehicleType: f.vehicle, rideDate: f.date, rideTime: f.time }
  if (f.from.id) body.fromCityId = f.from.id
  else body.fromCityRaw = f.from.name
  if (f.to.id) body.toCityId = f.to.id
  else body.toCityRaw = f.to.name
  if (f.fare !== '') body.fare = Number(f.fare)
  if (f.notes && f.notes.trim() !== '') body.notes = f.notes.trim()
  return body
}

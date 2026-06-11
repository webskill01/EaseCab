import { cityLabel, RIDE_KIND } from './rideView'

/**
 * Normalize the two API ride shapes (bot `/rides`, verified `/posted-rides`) into a
 * single card view-model so the feed list + RideCard treat them uniformly. `cityIds`
 * (pickup/drop, nulls dropped) backs the client-side live city-filter match (§Step 18).
 */

/** @param {object} r - a public bot ride row */
export function toBotVM(r) {
  return {
    kind: RIDE_KIND.BOT,
    id: r.id,
    status: r.status, // 'fresh' | 'booked' — aged client-side by statusOf
    receivedAt: r.receivedAt,
    from: cityLabel(r.pickupCityName, r.pickupRaw),
    to: cityLabel(r.dropCityName, r.dropRaw),
    vehicleType: r.vehicleType ?? null,
    message: r.displayText ?? null,
    cityIds: [r.pickupCityId, r.dropCityId].filter(Boolean),
  }
}

/**
 * Live city-filter predicate: with no lock everything passes; with a lock, keep
 * only rides whose pickup OR drop touches that City id. Backs the client-side drop
 * of non-matching SSE events (the SSE payload already carries the city ids).
 * @param {{ cityIds: string[] }} vm
 * @param {?string} cityId - the locked City id, or null/undefined for "All"
 * @returns {boolean}
 */
export function matchesCity(vm, cityId) {
  if (!cityId) return true
  return vm.cityIds.includes(cityId)
}

/** @param {object} p - a public posted-ride row from /posted-rides/mine (My Rides → Posted) */
export function toMyPostVM(p) {
  return {
    id: p.id,
    from: cityLabel(p.fromCityName, p.fromCityRaw),
    to: cityLabel(p.toCityName, p.toCityRaw),
    vehicleType: p.vehicleType ?? null,
    fare: p.fare ?? null,
    date: p.rideDate ?? null,
    status: p.status, // 'active' | 'done'
    isClosed: p.isClosed,
    createdAt: p.createdAt,
  }
}

/** @param {object} c - a /me/contacted item (My Rides → Contacted) */
export function toContactedVM(c) {
  return {
    kind: c.source === 'posted' ? RIDE_KIND.VERIFIED : RIDE_KIND.BOT,
    id: c.id,
    from: cityLabel(c.fromCityName, null),
    to: cityLabel(c.toCityName, null),
    vehicleType: c.vehicleType ?? null,
    phone: c.phoneNumber ?? null,
    contactedAt: c.contactedAt,
  }
}

/** @param {object} p - a public posted (verified) ride row */
export function toVerifiedVM(p) {
  return {
    kind: RIDE_KIND.VERIFIED,
    id: p.id,
    status: 'verified',
    receivedAt: p.createdAt,
    from: cityLabel(p.fromCityName, p.fromCityRaw),
    to: cityLabel(p.toCityName, p.toCityRaw),
    vehicleType: p.vehicleType ?? null,
    message: p.notes ?? null,
    fare: p.fare ?? null,
    date: p.rideDate ?? null,
    time: p.rideTime ?? null,
    cityIds: [p.fromCityId, p.toCityId].filter(Boolean),
  }
}

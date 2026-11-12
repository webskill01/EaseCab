/** Max saved RC numbers offered as quick-fill chips. */
export const SAVED_VEHICLES_MAX = 5

const norm = (v) => v.replace(/[\s-]/g, '').toUpperCase()

/**
 * RC numbers the driver already gave us: the verified profile RC first, then border-tax filings
 * (newest first), de-duplicated. No storage of its own — derived from data we already keep.
 * @param {?string} profileReg profile.verification.carRegNo
 * @param {Array<{ vehicleNo: string }>} [filings]
 * @returns {string[]}
 */
export function savedVehicles(profileReg, filings = []) {
  const all = [profileReg, ...filings.map((f) => f.vehicleNo)].filter(Boolean).map(norm)
  return [...new Set(all)].slice(0, SAVED_VEHICLES_MAX)
}

/**
 * Pure profile-form logic (Step 21c) — mirrors @easecab/shared (VEHICLE_TYPES +
 * isProfileComplete) locally; web doesn't bundle the shared package (same pattern
 * as rideView.js). Form state: { name, bio, baseCity, vehicle, languages[],
 * dpKey, dpPreview }. dpKey = a freshly-uploaded R2 key; dpPreview = a displayable
 * URL (existing profilePicUrl or the new upload's publicUrl).
 */
export const PROFILE_VEHICLES = Object.freeze([
  'Sedan', 'Innova', 'SUV', 'Urbania', 'Tempo Traveller', 'Bolero', 'Bus', 'Auto',
])
export const PROFILE_LANGUAGES = Object.freeze(['Punjabi', 'Hindi', 'English', 'Haryanvi', 'Urdu'])

/** Vehicle → VehicleIcon key (mirrors rides/lib/rideView.vehIconKey, the labels we use). */
export function vehIconKeyOf(v) {
  if (v === 'Tempo Traveller' || v === 'Urbania') return 'tt'
  if (v === 'SUV' || v === 'Innova' || v === 'Bolero') return 'suv'
  if (v === 'Bus') return 'bus'
  return 'sedan'
}

/** API profile (or null for onboarding) → editable form state. */
export function profileToForm(p) {
  return {
    name: p?.name ?? '',
    bio: p?.bio ?? '',
    baseCity: p?.baseCity ?? '',
    vehicle: p?.vehicleType ?? '',
    languages: Array.isArray(p?.languagesSpoken) ? [...p.languagesSpoken] : [],
    dpKey: null,
    dpPreview: p?.profilePicUrl ?? null,
  }
}

const filled = (s) => typeof s === 'string' && s.trim().length > 0

/** L1 completeness for the form (mirrors shared isProfileComplete; DP = preview OR a new key). */
export function isProfileFormComplete(f) {
  if (!f) return false
  const stringsOk = [f.name, f.bio, f.baseCity, f.vehicle].every(filled)
  const dpOk = filled(f.dpPreview) || filled(f.dpKey)
  return stringsOk && dpOk && Array.isArray(f.languages) && f.languages.length > 0
}

/** Form → PATCH /me/profile body (profileUpdateSchema). dpKey only when newly uploaded. */
export function toUpdateBody(f) {
  const body = {
    name: f.name.trim(), bio: f.bio.trim(), baseCity: f.baseCity.trim(),
    vehicleType: f.vehicle, languagesSpoken: f.languages,
  }
  if (filled(f.dpKey)) body.dpKey = f.dpKey
  return body
}

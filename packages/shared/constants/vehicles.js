'use strict';

/**
 * Vehicle type catalog + keyword extraction for WhatsApp ride leads.
 * Labels are the canonical display values stored on rides; the keyword map
 * is ordered most-specific-first so e.g. "innova" wins over "suv".
 */

const VEHICLE_TYPES = Object.freeze({
  SEDAN: 'Sedan',
  INNOVA: 'Innova',
  SUV: 'SUV',
  URBANIA: 'Urbania',
  TEMPO_TRAVELLER: 'Tempo Traveller',
  BOLERO: 'Bolero',
  BUS: 'Bus',
  AUTO: 'Auto',
});

// Order matters: more specific labels checked first (Innova before SUV, Tempo before Bus).
const VEHICLE_KEYWORDS = Object.freeze([
  [VEHICLE_TYPES.INNOVA, ['innova', 'crysta']],
  [VEHICLE_TYPES.TEMPO_TRAVELLER, ['tempo', 'traveller', '12 seater', '14 seater', '17 seater']],
  [VEHICLE_TYPES.URBANIA, ['urbania', 'force urbania']],
  [VEHICLE_TYPES.SUV, ['fortuner', 'scorpio', 'xuv', 'harrier', 'safari', 'ertiga', 'suv']],
  [VEHICLE_TYPES.BOLERO, ['bolero', 'bolero camper']],
  [VEHICLE_TYPES.BUS, ['coach', 'mini bus', '20 seater', '24 seater', 'bus']],
  [VEHICLE_TYPES.AUTO, ['e-rickshaw', 'tuk tuk', 'auto']],
  [VEHICLE_TYPES.SEDAN, ['dzire', 'etios', 'amaze', 'aspire', 'tigor', 'sedan', 'dezire', 'sadan']],
]);

/**
 * Match the first vehicle label whose keyword appears in the lowercased text.
 * @param {string} text
 * @returns {string|null}
 */
function matchVehicle(text) {
  if (typeof text !== 'string' || !text) return null;
  const lower = text.toLowerCase();
  for (const [label, keywords] of VEHICLE_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return label;
  }
  return null;
}

module.exports = { VEHICLE_TYPES, VEHICLE_KEYWORDS, matchVehicle };

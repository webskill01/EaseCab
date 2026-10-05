'use strict';

/**
 * Raw place text for a route side that matched no vocabulary city (misspellings
 * like "chandighar", unlisted towns like "ajitwal"). Returned as pickup/drop raw so
 * CityResolver queues it as an UnresolvedCityString and the Gemini backfill sweep
 * can map it later. Never fuzzes — that is the resolver's job.
 */

// Words that are never a place: request fillers, vehicles, time/date, contact,
// route keywords and common Hinglish glue. Lowercase, letters only.
const NOISE = Object.freeze(new Set([
  // request / filler
  'need', 'needed', 'required', 'require', 'req', 'urgent', 'want', 'please', 'pls', 'plz',
  'sir', 'ji', 'bhai', 'hai', 'hain', 'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'chahiye',
  'chaiye', 'chahie', 'jana', 'jaana', 'wala', 'wali', 'karna', 'krna', 'abhi', 'koi', 'ek',
  'for', 'the', 'a', 'an', 'at', 'in', 'on', 'and', 'or', 'go', 'via', 'only', 'any', 'all',
  'somewhere', 'anywhere', 'here', 'there', 'city', 'place',
  // vehicles / booking
  'taxi', 'cab', 'cabs', 'car', 'cars', 'vehicle', 'gaadi', 'gadi', 'innova', 'crysta', 'ertiga',
  'sedan', 'suv', 'dzire', 'dezire', 'swift', 'etios', 'xuv', 'scorpio', 'fortuner', 'tempo',
  'traveller', 'urbania', 'bolero', 'bus', 'auto', 'ac', 'non', 'nonac', 'seater', 'pax',
  'passenger', 'passengers', 'person', 'persons', 'duty', 'ride', 'trip', 'booking', 'book',
  'available', 'oneway', 'one', 'way', 'round', 'return', 'local', 'outstation', 'fare', 'rs', 'km',
  'sadan', 'sedaan', 'dizer', 'dizire', 'inova', 'ertica', 'wc', 'hp', // seen in the live queue
  // time / date
  'am', 'pm', 'time', 'date', 'today', 'tomorrow', 'tonight', 'kal', 'aaj', 'parso', 'subah',
  'sham', 'raat', 'morning', 'evening', 'night', 'noon', 'afternoon', 'now', 'hrs', 'hr', 'min',
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  // contact
  'call', 'contact', 'whatsapp', 'phone', 'mobile', 'number', 'no', 'msg',
  // route keywords
  'from', 'to', 'drop', 'pickup', 'pick', 'up', 'current', 'location',
]));

const MAX_WORDS = 3;
const MIN_LENGTH = 3;

/**
 * The first contiguous run (≤3) of place-like words, noise and digits removed.
 * @param {string[]} words - one route side, already normalized
 * @returns {?string} e.g. "hardiwar", "lajpat nagar"; null when nothing place-like remains
 */
function rawPlace(words) {
  const out = [];
  for (const w of words || []) {
    const t = String(w).toLowerCase().replace(/[^a-z]/g, '');
    if (!t || t.length < 2 || NOISE.has(t)) {
      if (out.length) break; // the place run ended
      continue;
    }
    out.push(t);
    if (out.length === MAX_WORDS) break;
  }
  const s = out.join(' ');
  return s.length >= MIN_LENGTH ? s : null;
}

/**
 * Fallback when no pattern found any vocabulary city: take the first directional
 * pattern (extractCities' priority order) whose sides yield raw place text. The
 * "drop" reversals need BOTH sides, same as the vocabulary rule, so a trailing
 * one-way "drop" never flips the route.
 * @param {string} normalized
 * @param {Array<{ re: RegExp, pickup: number, drop: number, both?: boolean }>} patterns
 * @returns {?{ pickup: ?string, drop: ?string }}
 */
function rawRoute(normalized, patterns) {
  for (const p of patterns) {
    const m = normalized.match(p.re);
    if (!m) continue;
    const side = (i) => (i && m[i] ? rawPlace(m[i].trim().split(/\s+/)) : null);
    const pickup = side(p.pickup);
    const drop = side(p.drop);
    if (p.both ? pickup && drop : pickup || drop) return { pickup, drop };
  }
  return null;
}

module.exports = { rawPlace, rawRoute };

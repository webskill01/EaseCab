/**
 * Pure view-model helpers for the "All Locations" overlay (Batch C, design-spec
 * §7.4). No React, no I/O — the overlay and its tests consume these so the
 * grouping / filtering logic is unit-tested in isolation.
 */

import { pickCityName } from './rideView'

/**
 * Pastel quick-pick chips (design-spec §2 "Pastel location chips"). `My location`
 * is the geo chip (resolves via nearest-city); the rest are corridor hubs matched
 * by canonical name against the loaded city list. bg/fg are design data (not in the
 * ec token palette), so they're inline here as a frozen constant.
 */
export const LOCATION_CHIPS = Object.freeze([
  Object.freeze({ key: 'my', geo: true, bg: '#FCE7F3', fg: '#9D2667' }),
  Object.freeze({ key: 'Dehradun', bg: '#FEF3C7', fg: '#92400E' }),
  Object.freeze({ key: 'Ludhiana', bg: '#DCFCE7', fg: '#166534' }),
  Object.freeze({ key: 'Mohali', bg: '#D1FAE5', fg: '#065F46' }),
  Object.freeze({ key: 'Chandigarh', bg: '#DBEAFE', fg: '#1D4ED8' }),
  Object.freeze({ key: 'Zirakpur', bg: '#EDE9FE', fg: '#5B21B6' }),
])

/**
 * Project an API city row to the `{ id, name }` shape the feed lock + pickers use,
 * with the name resolved for the active locale (pa/hi native, else canonical).
 * @param {{ id: string, canonicalName: string, namePa?: ?string, nameHi?: ?string }} city
 * @param {string} locale
 * @returns {{ id: string, name: string }}
 */
export function cityToView(city, locale) {
  return { id: city.id, name: pickCityName(city.canonicalName, { pa: city.namePa, hi: city.nameHi }, locale) }
}

/**
 * Filter cities by a query against BOTH the canonical and the localized name
 * (case-insensitive substring). Empty/whitespace query returns the list unchanged.
 * @param {Array} cities - API city rows
 * @param {string} q
 * @param {string} locale
 */
export function filterCities(cities, q, locale) {
  const needle = q.trim().toLowerCase()
  if (!needle) return cities
  return cities.filter((c) => {
    const localized = pickCityName(c.canonicalName, { pa: c.namePa, hi: c.nameHi }, locale)
    return c.canonicalName.toLowerCase().includes(needle) || (localized && localized.toLowerCase().includes(needle))
  })
}

/**
 * Group cities into A–Z buckets keyed by the canonical (Latin) first letter, so the
 * letter tiles stay stable across scripts. Buckets and the cities within them are
 * sorted by canonical name; each city is projected via `cityToView`.
 * @param {Array} cities - API city rows
 * @param {string} locale
 * @returns {{ letter: string, cities: {id: string, name: string}[] }[]}
 */
export function groupCitiesByLetter(cities, locale) {
  const buckets = new Map()
  for (const c of cities) {
    const letter = (c.canonicalName[0] || '#').toUpperCase()
    if (!buckets.has(letter)) buckets.set(letter, [])
    buckets.get(letter).push(c)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, rows]) => ({
      letter,
      cities: rows
        .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
        .map((c) => cityToView(c, locale)),
    }))
}

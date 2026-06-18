import { describe, it, expect } from 'vitest'
import { LOCATION_CHIPS, cityToView, filterCities, groupCitiesByLetter } from '../allLocations'

const ROWS = [
  { id: 'a1', canonicalName: 'Ambala', namePa: 'ਅੰਬਾਲਾ', nameHi: 'अंबाला' },
  { id: 'a2', canonicalName: 'Amritsar', namePa: 'ਅੰਮ੍ਰਿਤਸਰ', nameHi: 'अमृतसर' },
  { id: 'c1', canonicalName: 'Chandigarh', namePa: 'ਚੰਡੀਗੜ੍ਹ', nameHi: 'चंडीगढ़' },
  { id: 'l1', canonicalName: 'Ludhiana', namePa: null, nameHi: 'लुधियाना' },
]

describe('allLocations', () => {
  it('cityToView picks the localized name for pa, falls back to canonical when absent', () => {
    expect(cityToView(ROWS[0], 'pa')).toEqual({ id: 'a1', name: 'ਅੰਬਾਲਾ' })
    expect(cityToView(ROWS[3], 'pa')).toEqual({ id: 'l1', name: 'Ludhiana' }) // namePa null → canonical
    expect(cityToView(ROWS[0], 'en')).toEqual({ id: 'a1', name: 'Ambala' })
  })

  it('groupCitiesByLetter buckets by canonical first letter, sorted A–Z, localized names', () => {
    const groups = groupCitiesByLetter(ROWS, 'hi')
    expect(groups.map((g) => g.letter)).toEqual(['A', 'C', 'L'])
    expect(groups[0].cities).toEqual([
      { id: 'a1', name: 'अंबाला' },
      { id: 'a2', name: 'अमृतसर' },
    ])
    expect(groups[2].cities).toEqual([{ id: 'l1', name: 'लुधियाना' }])
  })

  it('filterCities matches canonical OR localized name, case-insensitive', () => {
    expect(filterCities(ROWS, 'amr', 'en').map((c) => c.id)).toEqual(['a2'])
    // localized (Hindi) match even though the query isn't in the canonical name
    expect(filterCities(ROWS, 'चंडीगढ़', 'hi').map((c) => c.id)).toEqual(['c1'])
    expect(filterCities(ROWS, '  ', 'en')).toHaveLength(4) // blank → unchanged
  })

  it('LOCATION_CHIPS leads with the geo "my location" chip', () => {
    expect(LOCATION_CHIPS[0].geo).toBe(true)
    expect(LOCATION_CHIPS.some((c) => c.key === 'Chandigarh')).toBe(true)
  })
})

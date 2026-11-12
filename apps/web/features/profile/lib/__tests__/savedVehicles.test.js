import { describe, it, expect } from 'vitest'
import { savedVehicles, SAVED_VEHICLES_MAX } from '../savedVehicles'

describe('savedVehicles', () => {
  it('profile RC first, then filings, normalised + de-duplicated', () => {
    expect(savedVehicles('pb01 c9079', [{ vehicleNo: 'PB01C9079' }, { vehicleNo: 'HR26-AB1234' }])).toEqual(['PB01C9079', 'HR26AB1234'])
  })
  it('works with no profile RC / no filings, and caps the list', () => {
    expect(savedVehicles(null)).toEqual([])
    const many = Array.from({ length: 9 }, (_, i) => ({ vehicleNo: `PB0${i}A1` }))
    expect(savedVehicles(null, many)).toHaveLength(SAVED_VEHICLES_MAX)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { readCityLock, writeCityLock } from '../cityLock'

beforeEach(() => {
  // clear the cookie between tests
  document.cookie = 'ec_city_lock=; path=/; max-age=0'
})

describe('cityLock', () => {
  it('round-trips a locked city through the cookie', () => {
    expect(readCityLock()).toBeNull()
    writeCityLock({ id: 'c1', name: 'Ludhiana' })
    expect(readCityLock()).toEqual({ id: 'c1', name: 'Ludhiana' })
  })

  it('clearing the lock returns null', () => {
    writeCityLock({ id: 'c1', name: 'Ludhiana' })
    writeCityLock(null)
    expect(readCityLock()).toBeNull()
  })

  it('ignores a malformed cookie value', () => {
    document.cookie = 'ec_city_lock=%7Bnot-json; path=/'
    expect(readCityLock()).toBeNull()
  })
})

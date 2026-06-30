import { describe, it, expect, beforeEach } from 'vitest'
import { readCityLock, writeCityLock } from '../cityLock'

beforeEach(() => {
  // clear the cookie between tests
  document.cookie = 'ec_city_lock=; path=/; max-age=0'
})

describe('cityLock', () => {
  it('round-trips a multi-city lock through the cookie', () => {
    expect(readCityLock()).toEqual([])
    writeCityLock([{ id: 'c1', name: 'Ludhiana' }, { id: 'c2', name: 'Mohali' }])
    expect(readCityLock()).toEqual([{ id: 'c1', name: 'Ludhiana' }, { id: 'c2', name: 'Mohali' }])
  })

  it('clearing the lock returns an empty array', () => {
    writeCityLock([{ id: 'c1', name: 'Ludhiana' }])
    writeCityLock([])
    expect(readCityLock()).toEqual([])
  })

  it('reads a legacy single-object cookie as a one-element array', () => {
    document.cookie = `ec_city_lock=${encodeURIComponent(JSON.stringify({ id: 'c1', name: 'Ludhiana' }))}; path=/`
    expect(readCityLock()).toEqual([{ id: 'c1', name: 'Ludhiana' }])
  })

  it('ignores a malformed cookie value', () => {
    document.cookie = 'ec_city_lock=%7Bnot-json; path=/'
    expect(readCityLock()).toEqual([])
  })
})

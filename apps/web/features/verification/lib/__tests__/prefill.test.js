import { describe, it, expect, beforeEach } from 'vitest'
import { stashPrefill, readPrefill, clearPrefill } from '../prefill'

beforeEach(() => sessionStorage.clear())

describe('prefill', () => {
  it('round-trips the demographics', () => {
    stashPrefill({ name: 'A', dob: '1990-01-01', gender: 'M', address: 'X' })
    expect(readPrefill()).toEqual({ name: 'A', dob: '1990-01-01', gender: 'M', address: 'X' })
  })
  it('readPrefill returns null when empty or corrupt', () => {
    expect(readPrefill()).toBeNull()
    sessionStorage.setItem('ec_aadhaar_prefill', '{bad json')
    expect(readPrefill()).toBeNull()
  })
  it('clearPrefill removes it', () => {
    stashPrefill({ name: 'A' }); clearPrefill()
    expect(readPrefill()).toBeNull()
  })
})

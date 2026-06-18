import { describe, it, expect } from 'vitest'
import { maskAadhaar, docState, groupAadhaar } from '../verifyView'

describe('verifyView', () => {
  it('maskAadhaar shows only the last 4', () => {
    expect(maskAadhaar('1234')).toBe('•••• •••• 1234')
    expect(maskAadhaar(null)).toBe('•••• •••• ••••')
  })
  it('docState maps a boolean flag to a status key', () => {
    expect(docState(true)).toBe('verified')
    expect(docState(false)).toBe('notStarted')
  })
  it('groupAadhaar formats digits into 4-4-4 groups, caps at 12, strips non-digits', () => {
    expect(groupAadhaar('123456789012')).toBe('1234 5678 9012')
    expect(groupAadhaar('1234')).toBe('1234')
    expect(groupAadhaar('12345')).toBe('1234 5')
    expect(groupAadhaar('1234abcd5678xy9012')).toBe('1234 5678 9012')
    expect(groupAadhaar('')).toBe('')
  })
})

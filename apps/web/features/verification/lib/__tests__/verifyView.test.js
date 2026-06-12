import { describe, it, expect } from 'vitest'
import { maskAadhaar, docState } from '../verifyView'

describe('verifyView', () => {
  it('maskAadhaar shows only the last 4', () => {
    expect(maskAadhaar('1234')).toBe('•••• •••• 1234')
    expect(maskAadhaar(null)).toBe('•••• •••• ••••')
  })
  it('docState maps a boolean flag to a status key', () => {
    expect(docState(true)).toBe('verified')
    expect(docState(false)).toBe('notStarted')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import {
  markRideViewed, getViewedCount,
  isPrePromptDismissed, dismissPrePrompt,
  getStoredToken, setStoredToken, clearStoredToken,
} from '../pushStorage'

beforeEach(() => localStorage.clear())

it('counts distinct viewed rides', () => {
  markRideViewed('r1'); markRideViewed('r1'); markRideViewed('r2')
  expect(getViewedCount()).toBe(2)
})

it('persists the dismissal flag', () => {
  expect(isPrePromptDismissed()).toBe(false)
  dismissPrePrompt()
  expect(isPrePromptDismissed()).toBe(true)
})

it('round-trips the device token', () => {
  setStoredToken('tok-1')
  expect(getStoredToken()).toBe('tok-1')
  clearStoredToken()
  expect(getStoredToken()).toBeNull()
})

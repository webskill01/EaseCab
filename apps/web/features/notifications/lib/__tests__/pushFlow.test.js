import { describe, it, expect, afterEach } from 'vitest'
import { permissionState, shouldShowPrePrompt, PRE_PROMPT_RIDES } from '../pushFlow'

afterEach(() => { delete global.Notification })

describe('permissionState', () => {
  it('reports unsupported when Notification is absent', () => {
    expect(permissionState()).toBe('unsupported')
  })
  it('reflects Notification.permission', () => {
    global.Notification = { permission: 'default' }
    expect(permissionState()).toBe('default')
  })
})

describe('shouldShowPrePrompt', () => {
  it('shows once threshold reached, permission default, not dismissed', () => {
    expect(shouldShowPrePrompt({ viewedCount: PRE_PROMPT_RIDES, dismissed: false, permission: 'default' })).toBe(true)
  })
  it('hides when dismissed / denied / granted / below threshold', () => {
    expect(shouldShowPrePrompt({ viewedCount: 3, dismissed: true, permission: 'default' })).toBe(false)
    expect(shouldShowPrePrompt({ viewedCount: 3, dismissed: false, permission: 'granted' })).toBe(false)
    expect(shouldShowPrePrompt({ viewedCount: 1, dismissed: false, permission: 'default' })).toBe(false)
  })
})

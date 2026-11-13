import { describe, it, expect, afterEach, vi } from 'vitest'
import { permissionState, shouldShowPrePrompt, PRE_PROMPT_RIDES, needsHomeScreen, alertProblem, ALERT_PROBLEM } from '../pushFlow'

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

describe('needsHomeScreen (iOS web push needs the Home Screen app)', () => {
  const setUa = (ua, standalone) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
    Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true })
  }
  afterEach(() => vi.restoreAllMocks())
  it('true for iPhone Safari, false once opened from the Home Screen, false on Android', () => {
    setUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/604.1', false)
    expect(needsHomeScreen()).toBe(true)
    setUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Safari/604.1', true)
    expect(needsHomeScreen()).toBe(false)
    setUa('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', undefined)
    expect(needsHomeScreen()).toBe(false)
  })
})

describe('alertProblem', () => {
  const setNative = (s) => localStorage.setItem('ec_native', JSON.stringify({ battery: true, ring: true, at: Date.now(), contacts: [], ...s }))
  const setPerm = (p) => vi.stubGlobal('Notification', { permission: p })
  afterEach(() => { localStorage.clear(); vi.unstubAllGlobals() })

  it('blocked beats everything; undecided is not a problem', () => {
    setNative({ ring: false, battery: false })
    setPerm('denied'); expect(alertProblem()).toBe(ALERT_PROBLEM.BLOCKED)
    setPerm('default'); expect(alertProblem()).toBeNull()
  })
  it('granted: muted channel, then battery, else fine', () => {
    setPerm('granted')
    setNative({ ring: false, battery: false }); expect(alertProblem()).toBe(ALERT_PROBLEM.SOUND)
    setNative({ battery: false }); expect(alertProblem()).toBe(ALERT_PROBLEM.BATTERY)
    setNative({}); expect(alertProblem()).toBeNull()
    localStorage.clear(); expect(alertProblem()).toBeNull() // browser, not the app
  })
})

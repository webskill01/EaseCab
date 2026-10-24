import { describe, it, expect, beforeEach } from 'vitest'
import { captureNativeLaunch, isNative, batteryRestricted, pushPlatform, nativePermissionAndToken, takePendingContacts } from '../nativePush'

beforeEach(() => { sessionStorage.clear(); history.replaceState(null, '', '/feed'); delete global.Notification })

describe('nativePush', () => {
  it('stays on web push without the app fragment', () => {
    captureNativeLaunch()
    expect(isNative()).toBe(false)
    expect(pushPlatform()).toBe('web')
    expect(batteryRestricted()).toBe(false)
  })

  it('reads and strips the launch fragment', async () => {
    global.Notification = { requestPermission: async () => 'granted' }
    history.replaceState(null, '', '/feed?bubble=1#nperm=1&nbat=0&ntok=abc%3A1&npc=r1,r2')
    captureNativeLaunch()
    expect(window.location.hash).toBe('')
    expect(window.location.search).toBe('?bubble=1')
    expect(isNative()).toBe(true)
    expect(pushPlatform()).toBe('android')
    expect(batteryRestricted()).toBe(true)
    expect(await nativePermissionAndToken()).toEqual({ permission: 'granted', token: 'abc:1' })
    expect(takePendingContacts()).toEqual(['r1', 'r2'])
    expect(takePendingContacts()).toEqual([]) // read once
  })

  it('gives no token when Android notifications are refused', async () => {
    global.Notification = { requestPermission: async () => 'denied' }
    history.replaceState(null, '', '/feed#nperm=0&nbat=1&ntok=abc')
    captureNativeLaunch()
    expect(await nativePermissionAndToken()).toEqual({ permission: 'denied', token: null })
    expect(batteryRestricted()).toBe(false)
  })
})

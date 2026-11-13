/** Notification-permission decisions (Step 23). alertProblem() also reads the app flags in nativePush. */
import { alertSoundOff, batteryRestricted } from '../services/nativePush'

export const PRE_PROMPT_RIDES = 3

/** @returns {'granted'|'denied'|'default'|'unsupported'} */
export function permissionState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * iPhone/iPad opened in Safari (not from the Home Screen). iOS only allows web push for an
 * app added to the Home Screen (iOS 16.4+), so there the fix is "install", not "settings".
 */
export function needsHomeScreen() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) // iPadOS says Mac
  const standalone = navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches
  return ios && !standalone
}

/**
 * Whether to show the in-feed soft pre-prompt: only when the OS state is still
 * undecided, the user hasn't dismissed it, and they've viewed enough rides.
 * @param {{ viewedCount: number, dismissed: boolean, permission: string, threshold?: number }} a
 */
export function shouldShowPrePrompt({ viewedCount, dismissed, permission, threshold = PRE_PROMPT_RIDES }) {
  return permission === 'default' && !dismissed && viewedCount >= threshold
}

export const ALERT_PROBLEM = Object.freeze({ BLOCKED: 'blocked', SOUND: 'sound', BATTERY: 'battery' })

/**
 * Why ride alerts won't reach / ring this driver, worst first, or null. Feeds the
 * warning chip on the feed's Notifications button. Undecided permission is not a
 * problem (the pre-prompt asks); sound/battery only matter once alerts are allowed.
 */
export function alertProblem() {
  const perm = permissionState()
  if (perm === 'denied') return ALERT_PROBLEM.BLOCKED
  if (perm !== 'granted') return null
  if (alertSoundOff()) return ALERT_PROBLEM.SOUND
  if (batteryRestricted()) return ALERT_PROBLEM.BATTERY
  return null
}

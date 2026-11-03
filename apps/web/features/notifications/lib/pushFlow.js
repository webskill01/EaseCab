/** Pure notification-permission decisions (Step 23). No I/O. */
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

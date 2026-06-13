/** Pure notification-permission decisions (Step 23). No I/O. */
export const PRE_PROMPT_RIDES = 3

/** @returns {'granted'|'denied'|'default'|'unsupported'} */
export function permissionState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * Whether to show the in-feed soft pre-prompt: only when the OS state is still
 * undecided, the user hasn't dismissed it, and they've viewed enough rides.
 * @param {{ viewedCount: number, dismissed: boolean, permission: string, threshold?: number }} a
 */
export function shouldShowPrePrompt({ viewedCount, dismissed, permission, threshold = PRE_PROMPT_RIDES }) {
  return permission === 'default' && !dismissed && viewedCount >= threshold
}

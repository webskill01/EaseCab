/**
 * App-shell SW registration boundary (Step 25) — mirrors fcmClient/geoClient.
 * No-op when service workers are unsupported or in E2E (keeps Playwright runs
 * deterministic). The live navigator.serviceWorker call is coverage-excluded.
 */
export async function registerAppShellSW() {
  if (process.env.NEXT_PUBLIC_E2E === 'true') return null
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

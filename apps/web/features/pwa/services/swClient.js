/**
 * App-shell SW registration boundary (Step 25) — mirrors fcmClient/geoClient.
 * No-op when service workers are unsupported or in E2E (keeps Playwright runs
 * deterministic). The live navigator.serviceWorker call is coverage-excluded.
 */
export async function registerAppShellSW() {
  if (process.env.NEXT_PUBLIC_E2E === 'true') return null
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  // In development the app-shell SW is more harm than help: a cached shell + bundles
  // from a prior run silently mask code changes during smoke tests (you keep seeing the
  // "old app"). So in dev we never register it AND proactively tear down any SW + caches
  // left over from an earlier production-like run, so the dev build is always served fresh.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {
      // best-effort cleanup — a failure here just leaves the stale SW for a manual unregister
    }
    return null
  }
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

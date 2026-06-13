/**
 * Geolocation boundary (Step 23). Resolves `{ lat, lng }` or rejects. E2E mode
 * uses `window.__ecGeoSeam`. The OS prompt fires inside getCurrentPosition.
 */
export function getCurrentPosition() {
  if (process.env.NEXT_PUBLIC_E2E === 'true') return window.__ecGeoSeam.getCurrentPosition()
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation-unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, maximumAge: 300000 },
    )
  })
}

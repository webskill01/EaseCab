import { apiFetch } from '@/lib/api/client'

/** R2 upload client (Step 21c). Mirrors the shared `UPLOAD_PURPOSE.dp` policy
 * (web doesn't bundle @easecab/shared; same mirroring pattern as rideView.js). */
export const DP_MAX_BYTES = 5 * 1024 * 1024
export const DP_MIMES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
// KYC docs (DL/RC images) — mirrors shared UPLOAD_PURPOSE.{rc_image,licence_image} (10MB, +PDF).
export const KYC_MAX_BYTES = 10 * 1024 * 1024
export const KYC_MIMES = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

/**
 * Client-side precheck for a chosen DP file (server re-checks via verifyUpload).
 * @param {{size: number, type: string}} file
 * @returns {?string} an i18n sub-key for the failure, or null when OK
 */
export function dpPrecheck(file) {
  if (file.size > DP_MAX_BYTES) return 'dp.tooBig'
  if (!DP_MIMES.includes(file.type)) return 'dp.badType'
  return null
}

/**
 * Client-side precheck for a DL/RC document file (server re-checks via verifyUpload).
 * @param {{size: number, type: string}} file
 * @returns {?string} a `verification` i18n sub-key for the failure, or null when OK
 */
export function kycPrecheck(file) {
  if (file.size > KYC_MAX_BYTES) return 'driver.docTooBig'
  if (!KYC_MIMES.includes(file.type)) return 'driver.docBadType'
  return null
}

/**
 * Request a presigned PUT URL for an upload purpose.
 * @param {{purpose: string, contentType: string}} input
 * @returns {Promise<{url: string, key: string, publicUrl: ?string, stub?: boolean}>}
 */
export async function presignUpload({ purpose, contentType }) {
  const { data } = await apiFetch('/uploads/presign', { method: 'POST', body: JSON.stringify({ purpose, contentType }) })
  return data
}

/**
 * Upload bytes straight to R2 via the presigned PUT (never through our API, §8/§12).
 * One PUT with the File as the raw body + the matching Content-Type header — R2 does
 * NOT implement S3 POST Object (presigned-POST form upload → 501), so PUT is required.
 * The Content-Type MUST equal what `presignUpload` was called with (it's a signed
 * header). When `stub` is set (local/demo R2 stub — no real bucket), there's nothing
 * to PUT to, so we resolve immediately; the server's verify gate accepts the key.
 * @param {{url: string, file: File, stub?: boolean}} input
 */
export async function uploadToR2({ url, file, stub = false }) {
  if (stub) return
  const res = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
  if (!res.ok) throw new Error(`R2 upload failed (${res.status})`)
}

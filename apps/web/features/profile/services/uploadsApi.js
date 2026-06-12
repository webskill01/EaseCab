import { apiFetch } from '@/lib/api/client'

/** R2 upload client (Step 21c). Mirrors the shared `UPLOAD_PURPOSE.dp` policy
 * (web doesn't bundle @easecab/shared; same mirroring pattern as rideView.js). */
export const DP_MAX_BYTES = 5 * 1024 * 1024
export const DP_MIMES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])

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
 * Request a presigned POST policy for an upload purpose.
 * @param {{purpose: string, contentType: string}} input
 * @returns {Promise<{url: string, fields: object, key: string, publicUrl: ?string}>}
 */
export async function presignUpload({ purpose, contentType }) {
  const { data } = await apiFetch('/uploads/presign', { method: 'POST', body: JSON.stringify({ purpose, contentType }) })
  return data
}

/**
 * Upload bytes straight to R2 via the presigned POST (never through our API, §8/§12).
 * No credentials, no JSON content-type — R2 wants a raw multipart form.
 * @param {{url: string, fields: object, file: File}} input
 */
export async function uploadToR2({ url, fields, file }) {
  const form = new FormData()
  Object.entries(fields).forEach(([k, v]) => form.append(k, v))
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`R2 upload failed (${res.status})`)
}

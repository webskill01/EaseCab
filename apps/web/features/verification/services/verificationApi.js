import { apiFetch } from '@/lib/api/client'

/** Verification API (client service, Step 21c). Aadhaar = 2 steps; DL/RC single calls. */

export async function startAadhaar(aadhaarNumber) {
  const { data } = await apiFetch('/verification/aadhaar/otp', { method: 'POST', body: JSON.stringify({ aadhaarNumber }) })
  return data
}

export async function verifyAadhaar({ clientId, otp }) {
  const { data } = await apiFetch('/verification/aadhaar/verify', { method: 'POST', body: JSON.stringify({ clientId, otp }) })
  return data
}

export async function verifyDl({ dlNumber, dob }) {
  const { data } = await apiFetch('/verification/dl', { method: 'POST', body: JSON.stringify({ dlNumber, dob }) })
  return data
}

export async function verifyRc(rcNumber) {
  const { data } = await apiFetch('/verification/rc', { method: 'POST', body: JSON.stringify({ rcNumber }) })
  return data
}

export async function getVerificationStatus() {
  const { data } = await apiFetch('/verification/me')
  return data
}

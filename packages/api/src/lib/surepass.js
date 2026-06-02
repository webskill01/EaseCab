'use strict';

const crypto = require('node:crypto');

/**
 * THE Surepass vendor boundary (mirrors lib/razorpay.js). The verification service
 * depends only on the normalized interface below — never on Surepass's wire shape —
 * so a provider swap or contract change replaces only this file. Live HTTP I/O is
 * coverage-excluded (.c8rc); the stub is unit-tested and used until incorporation.
 *
 * Surepass KYC endpoints (https://surepass.io docs): aadhaar generate/submit OTP,
 * driving-license, rc. Auth via Bearer token. We normalize every response to a
 * minimal { success, name, ref } / { clientId } — NEVER returning the raw doc data.
 *
 * @param {{ token: string, baseUrl: string }} creds
 */
function createSurepassClient({ token, baseUrl }) {
  async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { ok: res.ok, json };
  }

  return {
    async generateAadhaarOtp({ aadhaar }) {
      const { json } = await post('/api/v1/aadhaar-v2/generate-otp', { id_number: aadhaar });
      return { clientId: json.data && json.data.client_id };
    },
    async submitAadhaarOtp({ clientId, otp }) {
      const { ok, json } = await post('/api/v1/aadhaar-v2/submit-otp', { client_id: clientId, otp });
      const data = (json && json.data) || {};
      return { success: ok && data.status === 'success_aadhaar', name: data.full_name || null };
    },
    async verifyDl({ dlNumber, dob }) {
      const { ok, json } = await post('/api/v1/driving-license/driving-license', { id_number: dlNumber, dob });
      const data = (json && json.data) || {};
      return { success: ok && !!data.client_id, name: data.name || null, ref: data.client_id || null };
    },
    async verifyRc({ rcNumber }) {
      const { ok, json } = await post('/api/v1/rc/rc-full', { id_number: rcNumber });
      const data = (json && json.data) || {};
      return { success: ok && !!data.client_id, name: data.owner_name || null, ref: data.client_id || null };
    },
  };
}

/**
 * Deterministic stub used until the company + Surepass account exist (per the
 * locked vendor-deferral decision). Same interface, always succeeds. Selected in
 * server.js when SUREPASS_STUB=true. Swapping to the real client at go-live is an
 * env change, zero code change.
 */
function createStubSurepassClient() {
  return {
    async generateAadhaarOtp() { return { clientId: `stub_${crypto.randomUUID()}` }; },
    async submitAadhaarOtp() { return { success: true, name: 'STUB AADHAAR USER' }; },
    async verifyDl() { return { success: true, name: 'STUB DL USER', ref: `stub_${crypto.randomUUID()}` }; },
    async verifyRc() { return { success: true, name: 'STUB RC USER', ref: `stub_${crypto.randomUUID()}` }; },
  };
}

module.exports = { createSurepassClient, createStubSurepassClient };

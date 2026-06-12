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
      const masked = data.aadhaar_number || ''; // Surepass returns a MASKED number — never the full one
      return {
        success: ok && data.status === 'success_aadhaar',
        name: data.full_name || null,
        dob: data.dob || null,
        gender: data.gender || null,
        address: (data.address && (data.address.combined_address || null)) || data.full_address || null,
        last4: masked ? masked.replace(/\D/g, '').slice(-4) : null,
      };
    },
    async verifyDl({ dlNumber, dob }) {
      const { ok, json } = await post('/api/v1/driving-license/driving-license', { id_number: dlNumber, dob });
      const data = (json && json.data) || {};
      return {
        success: ok && !!data.client_id, name: data.name || null, ref: data.client_id || null,
        validUpto: data.doe || data.valid_upto || null,
        cov: Array.isArray(data.cov_details) ? data.cov_details.map((c) => c.cov).join(', ') : (data.cov || null),
      };
    },
    async verifyRc({ rcNumber }) {
      const { ok, json } = await post('/api/v1/rc/rc-full', { id_number: rcNumber });
      const data = (json && json.data) || {};
      return {
        success: ok && !!data.client_id, name: data.owner_name || null, ref: data.client_id || null,
        make: data.maker_description || data.maker_model || null,
        model: data.maker_model || data.vehicle_model || null,
        regNo: rcNumber,
      };
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
    async submitAadhaarOtp() {
      return { success: true, name: 'STUB AADHAAR USER', dob: '1990-01-01', gender: 'M', address: 'Ludhiana, Punjab', last4: '1234' };
    },
    async verifyDl() {
      return { success: true, name: 'STUB DL USER', ref: `stub_${crypto.randomUUID()}`, validUpto: '2030-01-01', cov: 'LMV' };
    },
    async verifyRc({ rcNumber } = {}) {
      return { success: true, name: 'STUB RC USER', ref: `stub_${crypto.randomUUID()}`, make: 'Toyota', model: 'Innova Crysta', regNo: rcNumber || 'PB10AB1234' };
    },
  };
}

module.exports = { createSurepassClient, createStubSurepassClient };

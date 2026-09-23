'use strict';

const { TWO_FACTOR } = require('@easecab/shared');

/**
 * THE 2factor.in SMS-OTP vendor boundary (Phase 16.5). 2Factor generates AND stores
 * the code; we only keep its session id (auth.repository, bound to the phone). The
 * template name selects the DLT-approved `easecab_login_otp` text. The API key sits in
 * the URL path by 2Factor's design, so nothing here may log the URL (§10).
 * Live I/O: coverage-excluded (.c8rc), exercised against the real account.
 *
 * @param {{ apiKey: string, template: string }} creds
 */
function createTwoFactorClient({ apiKey, template }) {
  async function call(path) {
    const res = await fetch(`${TWO_FACTOR.BASE_URL}/${encodeURIComponent(apiKey)}${path}`, {
      signal: AbortSignal.timeout(TWO_FACTOR.HTTP_TIMEOUT_MS),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  return {
    /**
     * Send an OTP SMS. @returns {Promise<string>} the 2Factor session id.
     * @param {string} phone - E.164 (+91…)
     */
    async sendOtp(phone) {
      const { status, body } = await call(`/SMS/${phone}/AUTOGEN/${encodeURIComponent(template)}`);
      if (body.Status !== TWO_FACTOR.STATUS_SUCCESS || !body.Details) {
        // Details is 2Factor's error text (e.g. insufficient balance) — no PII.
        throw new Error(`TWOFACTOR_SEND_${status}: ${body.Details || ''}`.trim());
      }
      return body.Details;
    },

    /**
     * @returns {Promise<boolean>} true on a match; false on mismatch/expired. Throws only
     *   when 2Factor itself is unreachable/5xx, so an outage never reads as "wrong code".
     */
    async verifyOtp(sessionId, otp) {
      const { status, body } = await call(`/SMS/VERIFY/${encodeURIComponent(sessionId)}/${otp}`);
      if (status >= 500) throw new Error(`TWOFACTOR_VERIFY_${status}`);
      return body.Status === TWO_FACTOR.STATUS_SUCCESS;
    },
  };
}

module.exports = { createTwoFactorClient };

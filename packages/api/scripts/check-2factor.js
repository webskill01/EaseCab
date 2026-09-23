'use strict';

/**
 * One-off 2Factor check (Phase 16.5) — proves the API key + DLT template mapping
 * deliver a real SMS, BEFORE flipping OTP_PROVIDER on the app.
 *
 *   node --env-file=.env scripts/check-2factor.js +919876543210          # send
 *   node --env-file=.env scripts/check-2factor.js +919876543210 123456   # verify
 *
 * Reads TWOFACTOR_API_KEY + TWOFACTOR_TEMPLATE from the env. Prints the session id
 * (not the key, not the OTP).
 */

const { createTwoFactorClient } = require('../src/lib/twoFactor');

async function main() {
  const [phone, otp] = process.argv.slice(2);
  const apiKey = process.env.TWOFACTOR_API_KEY;
  const template = process.env.TWOFACTOR_TEMPLATE || 'easecab_login_otp_txn';
  if (!apiKey) throw new Error('TWOFACTOR_API_KEY missing (add it to packages/api/.env)');
  if (!/^\+91[6-9]\d{9}$/.test(phone || '')) throw new Error('usage: test-2factor.js +91XXXXXXXXXX [otp]');

  const client = createTwoFactorClient({ apiKey, template });
  if (!otp) {
    const sessionId = await client.sendOtp(phone);
    console.log(`sent via template "${template}" — session ${sessionId}`);
    console.log(`now run: node --env-file=.env scripts/check-2factor.js ${phone} <code from SMS>`);
    return;
  }
  // Verify by phone so the session id doesn't have to be pasted back in.
  const res = await fetch(`https://2factor.in/API/V1/${apiKey}/SMS/VERIFY3/${phone}/${otp}`);
  const body = await res.json().catch(() => ({}));
  console.log(body.Status === 'Success' ? 'OTP MATCHED' : `FAILED: ${body.Details || res.status}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

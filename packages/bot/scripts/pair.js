'use strict';

// One-time WhatsApp pairing helper (Phase 2.5 6a operational path), headless-
// friendly. The numberPool supervisor only connects ALREADY-paired slots (so it
// never stalls on a QR nobody scans), so pairing is an explicit operator step.
//
// Uses a PAIRING CODE (not a terminal QR): you run this with the slot's phone
// number, it prints an 8-digit code, and in WhatsApp you go
//   Settings > Linked Devices > Link a device > Link with phone number instead
// and enter the code. Run once per slot (bootstrap slot-1, and each backup):
//
//   npm run pair --workspace=packages/bot -- slot-1 919XXXXXXXXX
//
// Phone = full international number, digits only (country code + number).
// Exits 0 once the slot is paired + online; then `npm start` picks it up.

const path = require('node:path');
const pino = require('pino');
const { env } = require('../config/env.js');
const { createConnection } = require('../features/whatsapp/connection');

const slot = (process.argv[2] || 'slot-1').trim();
const phone = (process.argv[3] || process.env.WA_PAIR_NUMBER || '').replace(/[^0-9]/g, '');
const logger = pino({ level: 'info' });

const sessionPath = path.join(env.WA_SESSION_PATH, slot);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 5;
let attempts = 0;
let codeRequested = false;

async function attempt() {
  attempts += 1;
  const sock = await createConnection({
    sessionPath,
    targetGroupJid: env.WA_TARGET_GROUP_JID,
    onMessage: async () => {}, // pairing only — ingest nothing
    logger,
    onOpen: () => {
      logger.info({ slot }, 'pairing complete — slot is paired and online; you can now run the bot');
      process.exit(0);
    },
    onClose: (code) => {
      // 401 = logged out (give up). Anything else mid-pairing (esp. 515
      // restartRequired right after the code is entered) just needs a reconnect
      // to finish — do NOT bail, or we'd quit exactly at success.
      if (code === 401 || attempts >= MAX_ATTEMPTS) {
        logger.error({ slot, code, attempts }, 'could not complete pairing — re-run');
        process.exit(1);
      }
      logger.info({ code, attempts }, 'reconnecting to continue/finalize pairing...');
      attempt();
    },
  });

  // Request a pairing code once, only if this slot is not already registered.
  if (!sock.authState.creds.registered && !codeRequested) {
    if (!phone) {
      logger.error(
        'slot not paired and no phone number given — re-run: npm run pair -- <slot> <number digits only, e.g. 919XXXXXXXXX>',
      );
      process.exit(1);
    }
    codeRequested = true;
    await delay(3000); // let the socket initialise before requesting
    try {
      const code = await sock.requestPairingCode(phone);
      logger.info(
        { code },
        'PAIRING CODE — WhatsApp > Linked Devices > Link a device > "Link with phone number instead", then enter this code',
      );
    } catch (err) {
      logger.error({ err: err.message }, 'failed to request pairing code — re-run');
      process.exit(1);
    }
  }
}

attempt().catch((err) => {
  // eslint-disable-next-line no-console -- pairing is an interactive operator step
  console.error('fatal: pairing failed to start:', err.message);
  process.exit(1);
});

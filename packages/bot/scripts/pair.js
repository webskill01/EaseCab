'use strict';

// One-time WhatsApp pairing helper (Phase 2.5 6a operational path), headless-
// friendly. The numberPool supervisor only connects ALREADY-paired slots (so it
// never stalls on a QR nobody scans), so pairing is an explicit operator step.
//
// Prints a QR in the terminal (rendered here — Baileys' printQRInTerminal is
// deprecated). In WhatsApp: Settings > Linked Devices > Link a device, then scan.
// Run once per slot (bootstrap slot-1, and again for each backup):
//
//   npm run pair --workspace=packages/bot -- slot-1
//
// Exits 0 once the slot is paired + online; then `npm start` picks it up.

const path = require('node:path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { env } = require('../config/env.js');
const { createConnection } = require('../features/whatsapp/connection');

const slot = (process.argv[2] || 'slot-1').trim();
const logger = pino({ level: 'info' });

const sessionPath = path.join(env.WA_SESSION_PATH, slot);
const MAX_ATTEMPTS = 8;
let attempts = 0;

async function attempt() {
  attempts += 1;
  await createConnection({
    sessionPath,
    targetGroupJid: env.WA_TARGET_GROUP_JID,
    onMessage: async () => {}, // pairing only — ingest nothing
    logger,
    onQr: (qr) => {
      // eslint-disable-next-line no-console -- the QR must reach the operator's terminal
      console.log(`\nScan this QR in WhatsApp > Linked Devices > Link a device (slot: ${slot}):\n`);
      qrcode.generate(qr, { small: true });
    },
    onOpen: () => {
      logger.info({ slot }, 'pairing complete — slot is paired and online; you can now run the bot');
      process.exit(0);
    },
    onClose: (code) => {
      // 401 = logged out (give up). Anything else mid-pairing (esp. 515
      // restartRequired right after scanning) just needs a reconnect to finish —
      // do NOT bail, or we'd quit exactly at success.
      if (code === 401 || attempts >= MAX_ATTEMPTS) {
        logger.error({ slot, code, attempts }, 'could not complete pairing — re-run');
        process.exit(1);
      }
      logger.info({ code, attempts }, 'reconnecting to continue/finalize pairing...');
      attempt();
    },
  });
}

attempt().catch((err) => {
  // eslint-disable-next-line no-console -- pairing is an interactive operator step
  console.error('fatal: pairing failed to start:', err.message);
  process.exit(1);
});

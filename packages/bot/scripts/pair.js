'use strict';

// One-time WhatsApp pairing helper (Phase 2.5 6a operational path).
//
// The numberPool supervisor only connects slots whose session dir is ALREADY
// paired, so it never stalls a headless VPS on a QR nobody scans. Pairing is
// therefore an explicit, interactive operator step — this script. Run it once
// per slot (bootstrap the first number, and again for each backup you add):
//
//   npm run pair --workspace=packages/bot -- slot-1
//   npm run pair --workspace=packages/bot -- slot-2
//
// It connects the given slot, prints the QR, and exits 0 the moment the number
// is paired + online (creds.json registered). After that, `npm start` will pick
// the slot up as eligible. Default slot label is slot-1.

const path = require('node:path');
const pino = require('pino');
const { env } = require('../config/env.js');
const { createConnection } = require('../features/whatsapp/connection');

const slot = (process.argv[2] || 'slot-1').trim();
const logger = pino({ level: 'info' });

async function main() {
  const sessionPath = path.join(env.WA_SESSION_PATH, slot);
  logger.info({ slot, sessionPath }, 'pairing: scan the QR below to pair this slot');

  await createConnection({
    sessionPath,
    targetGroupJid: env.WA_TARGET_GROUP_JID,
    onMessage: async () => {}, // pairing only — ingest nothing
    logger,
    onOpen: () => {
      logger.info({ slot }, 'pairing complete — slot is paired and online; you can now run the bot');
      process.exit(0);
    },
    onClose: (code) => {
      logger.error({ slot, code }, 'connection closed before pairing completed — re-run to retry');
      process.exit(1);
    },
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- pairing is an interactive operator step
  console.error('fatal: pairing failed to start:', err.message);
  process.exit(1);
});

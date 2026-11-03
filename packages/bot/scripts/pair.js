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

const fs = require('node:fs');
const path = require('node:path');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { env } = require('../config/env.js');
const { createConnection } = require('../features/whatsapp/connection');
const { qrSvg } = require('../features/sessions/qrSvg');

const slot = (process.argv[2] || 'slot-1').trim();
// Optional 2nd arg = phone number (country code, digits only) → print a pairing code
// instead of a QR, for linking a phone that isn't at the server (remote pairing).
// In WhatsApp: Linked Devices > Link a device > "Link with phone number instead".
const phone = (process.argv[3] || '').replace(/\D/g, '');
let codeRequested = false;

// Optional env PAIR_HTTP_PORT → also serve the live QR on an open web page so someone
// away from the server can scan it (same idea as the manager bots' QR pages).
let latestQr = '';

if (process.env.PAIR_HTTP_PORT) {
  require('node:http')
    .createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><meta name=viewport content="width=device-width"><meta http-equiv=refresh content=5>
<title>EaseCab bot QR</title><body style="font-family:sans-serif;text-align:center;background:#fff">
<h3>WhatsApp &gt; Linked Devices &gt; Link a device (${slot})</h3><div style="display:inline-block;padding:16px">${latestQr ? qrSvg(latestQr) : ''}</div>
<p>${latestQr ? 'Page refreshes every 5s — scan the latest QR' : 'Waiting for QR / already paired'}</p>`);
    })
    .listen(Number(process.env.PAIR_HTTP_PORT));
}
const logger = pino({ level: 'info' });

const sessionPath = path.join(env.WA_SESSION_PATH, slot);
const MAX_ATTEMPTS = 8;
let attempts = 0;

/**
 * Poll creds.json until it holds a finalized login (registered || me.id), then
 * exit 0. Guards against the async-write race that left a 0-byte creds.json.
 * @param {number} [tries]
 */
function waitForCreds(tries = 0) {
  let ok = false;
  try {
    const c = JSON.parse(fs.readFileSync(path.join(sessionPath, 'creds.json'), 'utf8'));
    ok = Boolean(c.registered || (c.me && c.me.id));
  } catch {
    ok = false; // missing / half-written → keep waiting
  }
  if (ok) {
    logger.info({ slot }, 'creds.json finalized — slot is paired; you can now run the bot');
    process.exit(0);
  }
  if (tries >= 40) {
    logger.error({ slot }, 'creds.json did not finalize within ~10s — re-run pairing');
    process.exit(1);
  }
  setTimeout(() => waitForCreds(tries + 1), 250);
}

async function attempt() {
  attempts += 1;
  const sock = await createConnection({
    sessionPath,
    // Pairing ingests and records nothing — the running bot discovers groups on connect.
    groups: { shouldIngest: () => false, nameOf: () => undefined, record: async () => {} },
    onMessage: async () => {}, // pairing only — ingest nothing
    logger,
    onQr: async (qr) => {
      latestQr = qr;
      if (phone) {
        if (codeRequested) return; // ponytail: one code per run; expired → re-run
        codeRequested = true;
        const code = await sock.requestPairingCode(phone);
        // eslint-disable-next-line no-console -- the code must reach the operator
        console.log(`
PAIRING CODE for ${slot}: ${code}
Enter it on the phone: Linked Devices > Link a device > Link with phone number instead
`);
        return;
      }
      // eslint-disable-next-line no-console -- the QR must reach the operator's terminal
      console.log(`\nScan this QR in WhatsApp > Linked Devices > Link a device (slot: ${slot}):\n`);
      qrcode.generate(qr, { small: true });
    },
    onOpen: () => {
      // Baileys writes creds.json asynchronously; exiting on `open` races that
      // write and can truncate creds.json to 0 bytes (slot then reads as unpaired).
      // Wait until creds.json actually finalizes (registered || me.id) before exit.
      latestQr = '';
      logger.info({ slot }, 'connection open — waiting for creds.json to finalize...');
      waitForCreds();
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

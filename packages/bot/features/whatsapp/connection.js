'use strict';

const makeWASocket = require('@whiskeysockets/baileys').default;
const {
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');

/**
 * Pull plain text out of a Baileys message node. Handles the two text-bearing
 * shapes we care about (a plain `conversation` and an `extendedTextMessage`).
 * @param {object} [message] - the `m.message` node
 * @returns {string} the text, or '' when the node carries none (media/system)
 */
function extractText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    (message.extendedTextMessage && message.extendedTextMessage.text) ||
    ''
  );
}

/**
 * Open a READ-ONLY Baileys connection for ONE number slot and hand every inbound
 * target-group message to `onMessage`. This module NEVER sends and owns NO
 * reconnect/failover policy — it just reports lifecycle via callbacks and cleans
 * itself up on close. The numberPool supervisor decides reconnect vs rotate
 * (Phase 2.5 6a). Excluded from coverage (live I/O) — verified by the manual
 * integration run.
 *
 * On close it removes its own listeners and ends the socket BEFORE calling
 * `onClose`, so the supervisor can spin up a fresh connection with no orphaned
 * listeners or sockets (this replaces the old self-recursion — security-review
 * L2).
 *
 * @param {object} deps
 * @param {string} deps.sessionPath - this slot's multi-file auth-state dir
 * @param {string} deps.targetGroupJid - the only group JID we ingest from
 * @param {(msg: {text: string, senderJid: string, groupId: string, groupName?: string}) => Promise<unknown>} deps.onMessage
 * @param {() => void} [deps.onOpen] - called once the connection is open
 * @param {(code: number|undefined) => void} [deps.onClose] - called after cleanup on close, with the disconnect status code
 * @param {(qr: string) => void} [deps.onQr] - called with each QR string while unpaired (pairing only; supervised slots are already paired)
 * @param {{ info: Function, warn: Function, error: Function }} deps.logger
 * @returns {Promise<object>} the live socket (caller may end it on timeout/shutdown)
 */
async function createConnection({ sessionPath, targetGroupJid, onMessage, onOpen, onClose, onQr, logger }) {
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  // Pin the current WhatsApp Web build — a stale hardcoded version makes WA reject
  // the handshake with a 405 ("connection failure"). Required for every connect.
  const { version } = await fetchLatestBaileysVersion();
  let groupName; // cached subject of the target group, filled on connect
  let closed = false; // guard so we report close exactly once

  const sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.appropriate('EaseCab-Bot'),
    logger: pino({ level: 'silent' }), // silence Baileys internals; we log our own
    markOnlineOnConnect: false, // stay invisible — read-only listener
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    // While unpaired Baileys emits a fresh QR string here (printQRInTerminal is
    // deprecated/no-op in current Baileys, so the caller renders it).
    if (update.qr && onQr) onQr(update.qr);
    if (connection === 'open') {
      logger.info('WA connection open');
      try {
        const meta = await sock.groupMetadata(targetGroupJid);
        groupName = meta && meta.subject;
      } catch (err) {
        logger.warn({ err: err.message }, 'could not fetch target group metadata');
      }
      if (onOpen) onOpen();
    } else if (connection === 'close') {
      if (closed) return; // ignore duplicate close events
      closed = true;
      const code =
        lastDisconnect &&
        lastDisconnect.error &&
        lastDisconnect.error.output &&
        lastDisconnect.error.output.statusCode;
      logger.warn({ code }, 'WA connection closed — handing off to supervisor');
      // Clean up BEFORE handing back so no listeners/sockets leak across reconnects.
      try {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        sock.ev.removeAllListeners('messages.upsert');
        sock.end(undefined);
      } catch {
        // socket may already be torn down — nothing to do
      }
      if (onClose) onClose(code);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return; // ignore history/append syncs
    for (const m of messages) {
      const jid = m.key && m.key.remoteJid;
      if (jid !== targetGroupJid || m.key.fromMe) continue;
      const text = extractText(m.message);
      if (!text) continue;
      const senderJid = m.key.participant || jid;
      try {
        await onMessage({ text, senderJid, groupId: jid, groupName });
      } catch (err) {
        // onMessage (processMessage) is contracted never to throw; guard anyway
        // so one bad message can never tear down the listener.
        logger.error({ err: err.message }, 'onMessage threw unexpectedly');
      }
    }
  });

  return sock;
}

module.exports = { createConnection, extractText };

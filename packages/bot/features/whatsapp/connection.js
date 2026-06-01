'use strict';

const makeWASocket = require('@whiskeysockets/baileys').default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
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
 * Open a READ-ONLY Baileys connection to a single target WhatsApp group and hand
 * every inbound group message to `onMessage`. This module NEVER sends. It
 * reconnects on transient drops and stops only on an explicit logout. Excluded
 * from coverage (live I/O) — verified by the manual integration run (plan Task 11).
 *
 * @param {object} deps
 * @param {string} deps.sessionPath - directory for multi-file auth state
 * @param {string} deps.targetGroupJid - the only group JID we ingest from
 * @param {(msg: {text: string, senderJid: string, groupId: string, groupName?: string}) => Promise<unknown>} deps.onMessage
 * @param {{ info: Function, warn: Function, error: Function }} deps.logger
 * @returns {Promise<object>} the live socket (caller closes it on shutdown)
 */
async function createConnection({ sessionPath, targetGroupJid, onMessage, logger }) {
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  let groupName; // cached subject of the target group, filled on connect

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // first run prints the pairing QR
    browser: Browsers.appropriate('EaseCab-Bot'),
    logger: pino({ level: 'silent' }), // silence Baileys internals; we log our own
    markOnlineOnConnect: false, // stay invisible — read-only listener
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      logger.info('WA connection open');
      try {
        const meta = await sock.groupMetadata(targetGroupJid);
        groupName = meta && meta.subject;
      } catch (err) {
        logger.warn({ err: err.message }, 'could not fetch target group metadata');
      }
    } else if (connection === 'close') {
      const code =
        lastDisconnect &&
        lastDisconnect.error &&
        lastDisconnect.error.output &&
        lastDisconnect.error.output.statusCode;
      if (code === DisconnectReason.loggedOut) {
        logger.error('WA logged out — delete the session dir and re-pair to reconnect');
      } else {
        logger.warn({ code }, 'WA connection closed — reconnecting');
        createConnection({ sessionPath, targetGroupJid, onMessage, logger });
      }
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

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { PAIR_STATUS, WA_SESSIONS, SLOT_STATE, botPairKey } = require('@easecab/shared');
const { defaultIsPaired } = require('../whatsapp/slotRegistry');
const { qrSvg } = require('./qrSvg');

const LOGGED_OUT = 401;
const CREDS_POLL_MS = 250;
const CREDS_POLL_TRIES = 40; // ~10s for Baileys' async creds.json write

/**
 * Get a session dir out of the way. A paired one is renamed (recoverable by hand);
 * a half-paired one is junk and is deleted.
 * @param {string} dir
 * @param {string} tag - 'old' (re-pair) or 'removed' (session deleted in admin)
 */
function moveAside(dir, tag) {
  if (!fs.existsSync(dir)) return;
  if (!defaultIsPaired(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  }
  fs.renameSync(dir, path.join(path.dirname(dir), `.${tag}-${path.basename(dir)}-${Date.now()}`));
}

/** @param {string} dir @returns {?string} linked number once creds.json is final */
function linkedPhone(dir) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(dir, 'creds.json'), 'utf8'));
    return c.me && c.me.id ? c.me.id.split(/[:@]/)[0] : null;
  } catch {
    return null; // missing / half-written
  }
}

/**
 * Pair WhatsApp numbers from the admin panel (Phase 25). The API publishes
 * { slot, phone? } on BOT_PAIR_CMD_CHANNEL; this runs one pairing socket for that
 * slot and writes its progress (QR svg / pairing code / result) to botPairKey(slot),
 * which the admin page and the public share page poll. The pool leaves the slot
 * alone while it is in `busy`, then picks it up on rescan once paired.
 *
 * @param {object} deps
 * @param {{ set: Function }} deps.redis
 * @param {{ info: Function, warn: Function, error: Function }} deps.logger
 * @param {{ sessionDirFor: Function }} deps.registry
 * @param {{ release: Function, rescan: Function }} deps.pool
 * @param {Set<string>} deps.busy - shared with the pool
 * @param {{ knownSlots: () => Set<string>, notePhone: Function }} deps.sessions
 * @param {Function} deps.connectionFactory - createConnection
 * @returns {{ handle: (cmd: { slot: string, phone?: string }) => Promise<void> }}
 */
function createPairingManager({ redis, logger, registry, pool, busy, sessions, connectionFactory }) {
  const runs = new Map(); // slot -> { cancel }
  const gens = new Map(); // slot -> latest pairing request (a superseded one must not clean up)

  /** @param {string} slot @param {object} state */
  function publish(slot, state) {
    return redis.set(botPairKey(slot), JSON.stringify({ ...state, updatedAt: Date.now() }),
      'EX', WA_SESSIONS.PAIR_STATE_TTL_SEC)
      .catch((err) => logger.warn({ err: err.message, slot }, 'pairing: could not store state'));
  }

  /** One pairing run; resolves when it ends (paired, expired, failed or cancelled). */
  function run(slot, phone) {
    const dir = registry.sessionDirFor(slot);
    let sock = null;
    let attempts = 0;
    let codeSent = false;
    let done = false;

    return new Promise((resolve) => {
      function finish(status, extra = {}) {
        if (done) return;
        done = true;
        clearTimeout(windowTimer);
        try {
          if (sock) sock.end(undefined);
        } catch {
          // already closed
        }
        if (status) publish(slot, { status, ...extra });
        resolve(status);
      }
      const windowTimer = setTimeout(() => finish(PAIR_STATUS.EXPIRED), WA_SESSIONS.PAIR_WINDOW_MS);
      runs.set(slot, { cancel: () => finish(null) });

      async function onQr(qr) {
        if (done) return;
        if (!phone) {
          publish(slot, { status: PAIR_STATUS.QR, qrSvg: qrSvg(qr) });
          return;
        }
        if (codeSent) return; // one code per run; the QR refresh does not need a new one
        codeSent = true;
        try {
          publish(slot, { status: PAIR_STATUS.CODE, code: await sock.requestPairingCode(phone) });
        } catch (err) {
          logger.warn({ err: err.message, slot }, 'pairing: code request failed');
          finish(PAIR_STATUS.FAILED);
        }
      }

      function waitForCreds(tries = 0) {
        if (done) return;
        const linked = linkedPhone(dir);
        if (linked) {
          sessions.notePhone(slot, linked, true);
          finish(PAIR_STATUS.PAIRED);
        } else if (tries >= CREDS_POLL_TRIES) {
          finish(PAIR_STATUS.FAILED);
        } else {
          setTimeout(() => waitForCreds(tries + 1), CREDS_POLL_MS);
        }
      }

      async function attempt() {
        attempts += 1;
        try {
          sock = await connectionFactory({
            sessionPath: dir,
            // Pairing ingests and records nothing; the pool discovers groups once it connects.
            groups: { shouldIngest: () => false, nameOf: () => undefined, namelessJids: () => [], record: async () => {} },
            onMessage: async () => {},
            logger: logger.child ? logger.child({ slot, pairing: true }) : logger,
            onQr,
            onOpen: () => waitForCreds(),
            onClose: (code) => {
              if (done) return;
              // 515 restartRequired right after a scan is normal: reconnect to finish.
              if (code === LOGGED_OUT || attempts >= WA_SESSIONS.PAIR_MAX_RECONNECTS) finish(PAIR_STATUS.FAILED);
              else attempt();
            },
          });
        } catch (err) {
          logger.error({ err: err.message, slot }, 'pairing: socket failed to open');
          finish(PAIR_STATUS.FAILED);
        }
      }
      attempt();
    });
  }

  /**
   * Start (or restart) pairing a slot. Any old session for it is moved aside first.
   * @param {{ slot: string, phone?: string }} cmd - already validated by the API
   */
  async function handle({ slot, phone }) {
    if (!sessions.knownSlots().has(slot)) return logger.warn({ slot }, 'pairing: unknown slot');
    const gen = (gens.get(slot) || 0) + 1;
    gens.set(slot, gen);
    if (runs.has(slot)) runs.get(slot).cancel();
    busy.add(slot);
    try {
      await pool.release(slot, { state: SLOT_STATE.UNREGISTERED });
      moveAside(registry.sessionDirFor(slot), 'old');
      await publish(slot, { status: PAIR_STATUS.STARTING });
      logger.info({ slot, byCode: Boolean(phone) }, 'pairing started');
      const status = await run(slot, phone);
      if (status) logger.info({ slot, status }, 'pairing ended');
    } catch (err) {
      logger.error({ err: err.message, slot }, 'pairing crashed');
      publish(slot, { status: PAIR_STATUS.FAILED });
    } finally {
      if (gens.get(slot) === gen) {
        runs.delete(slot);
        busy.delete(slot);
        pool.rescan();
      }
    }
  }

  return { handle };
}

module.exports = { createPairingManager, moveAside, linkedPhone };

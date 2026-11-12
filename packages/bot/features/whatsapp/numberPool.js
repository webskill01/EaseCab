'use strict';

const {
  SLOT_STATE,
  ALERT_EVENT,
  ALERT_SEV,
  BOT_HEALTH,
  BACKOFF,
  BOT_NUMBERS_KEY,
  WA_SESSIONS,
} = require('@easecab/shared');
const { decideOnClose } = require('./failoverPolicy');
const { nextDelayMs } = require('./backoff');
const { createSilenceWatch } = require('./slotSilence');

/** Supervisor-local lifecycle of one slot (only BANNED/DEGRADED are terminal-ish). */
const RUN = Object.freeze({
  CONNECTING: 'connecting', // connecting or waiting out a backoff
  OPEN: 'open',
  BANNED: 'banned', // logged out — never retried this run
  DEGRADED: 'degraded', // backoff exhausted — retried on the next rescan
});

/**
 * Supervise the WhatsApp number pool (multi-session, 2026-11-03). EVERY paired slot
 * runs at the same time, each with its own failover policy: transient -> reconnect
 * that slot with exponential backoff; logout -> BANNED (out for the run); backoff
 * exhausted / connect-timeout -> DEGRADED (retried each rescan). One dying number
 * never touches the others. ALL_EXHAUSTED (sev-1) fires only when no slot is
 * connecting or open; the rescan also starts slots the operator pairs later.
 *
 * Duplicate rides from numbers sharing a group are the ingest layer's job (message-id
 * claim + fingerprint + unique constraint), not this module's. Each message is tagged
 * with its slot as `botId`.
 *
 * @param {object} deps
 * @param {string[]} deps.slots - all configured slot labels (for UNREGISTERED marking)
 * @param {object} deps.groups - group store (which groups to ingest)
 * @param {Function} deps.onMessage - the ingest orchestrator (processMessage)
 * @param {{info:Function,warn:Function,error:Function}} deps.logger
 * @param {{hset:Function}} deps.redis - ioredis (slot-state mirror)
 * @param {{raise:Function,clear:Function}} deps.alerter
 * @param {{sessionDirFor:Function,eligibleSlots:Function}} deps.registry
 * @param {Function} deps.connectionFactory - createConnection
 * @param {number} deps.loggedOutCode - DisconnectReason.loggedOut
 * @param {Set<string>} [deps.busy] - slots a pairing run owns right now (never supervised meanwhile)
 * @param {(slot: string, phone: string) => void} [deps.onPhone] - linked number seen on open
 * @param {(slot: string, jids: string[]) => void} [deps.onGroups] - groups seen on connect
 * @returns {{ start: Function, stop: Function, rescan: Function, release: Function }}
 */
function createNumberPool({
  groups, onMessage, logger, redis, alerter, registry, connectionFactory, loggedOutCode,
  busy = new Set(), onPhone = () => {}, onGroups = () => {},
}) {
  const sups = new Map(); // slot -> supervisor
  const meta = new Map(); // slot -> { state, lastCode, since }
  const opens = new Map(); // slot -> successful connects since boot (reconnects = opens - 1)
  const bootAt = Date.now();
  let stopped = false;
  let dark = false; // ALL_EXHAUSTED currently raised
  let rescanTimer = null;
  let watchdogTimer = null;
  let liveTimer = null;
  const silence = createSilenceWatch(alerter);

  /** Write a slot's live record (the admin Sessions tab reads `at` to tell the bot is alive). */
  async function writeLive(slot) {
    const rec = meta.get(slot) || { state: SLOT_STATE.UNREGISTERED, lastCode: null, since: Date.now() };
    const sup = sups.get(slot);
    try {
      await redis.hset(BOT_NUMBERS_KEY, slot, JSON.stringify({
        ...rec, lastMsgAt: sup ? sup.lastMsgAt() : null, at: Date.now(),
        reconnects: Math.max(0, (opens.get(slot) || 0) - 1), bootAt,
      }));
    } catch (err) {
      logger.warn({ err: err.message, slot }, 'numberPool: failed to persist slot state');
    }
  }

  /** Mirror a slot's state into the easecab:bot:numbers hash (best-effort). */
  function setSlotState(slot, state, code) {
    meta.set(slot, { state, lastCode: code === undefined ? null : code, since: Date.now() });
    return writeLive(slot);
  }

  /** Raise ALL_EXHAUSTED once no slot is connecting or open. */
  function checkDark() {
    const alive = [...sups.values()].some((s) => s.run() === RUN.OPEN || s.run() === RUN.CONNECTING);
    if (alive || dark || stopped) return;
    dark = true;
    logger.error('numberPool: all numbers down — feed is dark');
    alerter.raise(ALERT_EVENT.ALL_EXHAUSTED, ALERT_SEV.SEV1);
  }

  /**
   * Alert field per slot: the alerter only notifies when a field is NEW, so a shared
   * NUMBER_BANNED field would silence every ban after the first.
   * @param {string} event @param {string} slot @returns {string}
   */
  const slotAlert = (event, slot) => `${event}:${slot}`;

  function onSlotOpen(slot) {
    dark = false;
    alerter.clear(slotAlert(ALERT_EVENT.NUMBER_DOWN, slot));
    alerter.clear(slotAlert(ALERT_EVENT.NUMBER_BANNED, slot)); // re-paired after a logout
    // Covers a recovery by process restart too.
    alerter.clear(ALERT_EVENT.ALL_EXHAUSTED);
  }

  /**
   * One slot's connect / backoff / stall loop. `token` identifies the live attempt so
   * callbacks from a superseded socket are ignored.
   * @param {string} slot
   */
  function createSupervisor(slot) {
    let sock = null;
    let run = RUN.CONNECTING;
    let attempt = 0; // consecutive transient retries
    let token = 0;
    let connectTimer = null;
    let backoffTimer = null;
    let lastActivityAt = 0; // epoch ms of the last inbound group message (stall watchdog, #16)
    let lastMsgAt = null; // last real message (stats; the watchdog resets lastActivityAt)
    const startedAt = Date.now(); // silence baseline before the first message

    const tagged = async (m) => {
      lastActivityAt = Date.now();
      lastMsgAt = lastActivityAt;
      return onMessage({ ...m, botId: slot });
    };

    function endSock() {
      try {
        if (sock) sock.end(undefined);
      } catch {
        // already closed
      }
    }

    async function connect() {
      if (stopped) return;
      run = RUN.CONNECTING;
      setSlotState(slot, SLOT_STATE.CONNECTING);
      const myToken = (token += 1);
      try {
        sock = await connectionFactory({
          sessionPath: registry.sessionDirFor(slot),
          groups,
          onMessage: tagged,
          onGroups: (jids) => onGroups(slot, jids),
          logger: logger.child ? logger.child({ slot }) : logger,
          onOpen: () => {
            if (stopped || myToken !== token) return;
            clearTimeout(connectTimer);
            attempt = 0;
            run = RUN.OPEN;
            lastActivityAt = Date.now(); // reset the stall window on a fresh open
            logger.info({ slot }, 'numberPool: slot active');
            opens.set(slot, (opens.get(slot) || 0) + 1);
            setSlotState(slot, SLOT_STATE.ACTIVE);
            onSlotOpen(slot);
            const jid = sock && sock.user && sock.user.id; // "<number>:<device>@s.whatsapp.net"
            if (jid) onPhone(slot, jid.split(/[:@]/)[0]);
          },
          onClose: (code) => {
            if (stopped || myToken !== token) return;
            clearTimeout(connectTimer);
            handleClose(code);
          },
        });
      } catch (err) {
        logger.error({ err: err.message, slot }, 'numberPool: failed to open connection');
        if (!stopped && myToken === token) handleClose(undefined);
        return;
      }
      connectTimer = setTimeout(() => {
        if (stopped || myToken !== token) return;
        logger.warn({ slot }, 'numberPool: connect timeout — no open');
        token += 1; // invalidate this attempt's onOpen/onClose
        endSock();
        handleClose(undefined);
      }, BOT_HEALTH.CONNECT_TIMEOUT_MS);
    }

    function handleClose(code) {
      if (stopped) return;
      attempt += 1;
      const decision = decideOnClose({ code, attempt, maxAttempts: BACKOFF.MAX_ATTEMPTS, loggedOutCode });
      if (decision.action === 'reconnect') {
        run = RUN.CONNECTING;
        setSlotState(slot, SLOT_STATE.CONNECTING, code);
        const delay = nextDelayMs(attempt);
        logger.warn({ slot, attempt, delay }, 'numberPool: reconnecting slot after backoff');
        backoffTimer = setTimeout(connect, delay);
        return;
      }
      attempt = 0;
      if (decision.ban) {
        run = RUN.BANNED;
        setSlotState(slot, SLOT_STATE.BANNED, code);
        alerter.raise(slotAlert(ALERT_EVENT.NUMBER_BANNED, slot), ALERT_SEV.WARN, { slot });
      } else {
        run = RUN.DEGRADED;
        setSlotState(slot, SLOT_STATE.DEGRADED, code);
        alerter.raise(slotAlert(ALERT_EVENT.NUMBER_DOWN, slot), ALERT_SEV.WARN, { slot });
      }
      logger.warn({ slot, run }, 'numberPool: slot down; other slots keep ingesting');
      checkDark();
    }

    /** Force-end an OPEN socket that went silent (Baileys can wedge with no 'close'). */
    function checkStall() {
      if (stopped || run !== RUN.OPEN || !sock) return;
      if (Date.now() - lastActivityAt < BOT_HEALTH.STALL_WATCHDOG_MS) return;
      logger.warn({ slot, idleMs: Date.now() - lastActivityAt }, 'numberPool: inbound silence — forcing reconnect (stall watchdog)');
      run = RUN.CONNECTING;
      lastActivityAt = Date.now();
      endSock(); // fires 'close' → onClose → transient reconnect
    }

    /** @param {boolean} [logout] - also unlink the device on WhatsApp (session removed) */
    async function stop(logout = false) {
      token += 1; // ignore the close this triggers
      clearTimeout(connectTimer);
      clearTimeout(backoffTimer);
      if (logout && sock && run === RUN.OPEN) {
        await sock.logout().catch((err) => logger.warn({ err: err.message, slot }, 'numberPool: logout failed'));
      }
      endSock();
    }

    const live = () => run === RUN.OPEN || run === RUN.CONNECTING;
    return { connect, checkStall, stop, run: () => run, lastMsgAt: () => lastMsgAt, silence: () => ({ live: live(), lastMsgAt, startedAt }) };
  }

  /**
   * Stop supervising a slot (paused, removed, or about to be re-paired).
   * @param {string} slot
   * @param {{ logout?: boolean, state?: string }} [opts]
   */
  async function release(slot, { logout = false, state = SLOT_STATE.PAUSED } = {}) {
    const sup = sups.get(slot);
    sups.delete(slot);
    if (sup) await sup.stop(logout);
    silence.forget(slot);
    setSlotState(slot, state);
    logger.info({ slot, state }, 'numberPool: slot released');
  }

  /** Start supervisors for newly paired slots, retry degraded ones, drop unlisted ones. */
  function rescan() {
    if (stopped) return;
    const listed = new Set(registry.listedSlots());
    for (const slot of sups.keys()) if (!listed.has(slot)) release(slot);
    for (const slot of registry.eligibleSlots()) {
      if (busy.has(slot)) continue; // a pairing run owns this session dir
      const sup = sups.get(slot);
      if (!sup) {
        const fresh = createSupervisor(slot);
        sups.set(slot, fresh);
        fresh.connect();
      } else if (sup.run() === RUN.DEGRADED) {
        logger.info({ slot }, 'numberPool: retrying degraded slot');
        sup.connect();
      }
    }
    checkDark();
  }

  /** Begin supervising: mark unregistered slots, connect every paired one. */
  function start() {
    const eligible = new Set(registry.eligibleSlots());
    for (const slot of registry.listedSlots()) {
      if (!eligible.has(slot)) setSlotState(slot, SLOT_STATE.UNREGISTERED);
    }
    // Every listed slot's record is refreshed so the admin panel can tell OFFLINE (bot dead).
    liveTimer = setInterval(() => registry.listedSlots().forEach(writeLive), WA_SESSIONS.LIVE_TICK_MS);
    watchdogTimer = setInterval(() => sups.forEach((s, slot) => {
      s.checkStall();
      silence.check(slot, s.silence());
    }), BOT_HEALTH.WATCHDOG_CHECK_MS);
    rescanTimer = setInterval(rescan, BOT_HEALTH.RESCAN_MS);
    rescan();
  }

  /** Stop supervising: cancel all timers and end every live socket. */
  function stop() {
    stopped = true;
    clearInterval(rescanTimer);
    clearInterval(watchdogTimer);
    clearInterval(liveTimer);
    sups.forEach((s) => s.stop());
  }

  return { start, stop, rescan, release };
}

module.exports = { createNumberPool };

'use strict';

const {
  SLOT_STATE,
  ALERT_EVENT,
  ALERT_SEV,
  BOT_HEALTH,
  BACKOFF,
  BOT_NUMBERS_KEY,
} = require('@easecab/shared');
const { decideOnClose } = require('./failoverPolicy');
const { nextDelayMs } = require('./backoff');

/**
 * Supervise the WhatsApp number pool (Phase 2.5 6a). Runs ONE slot at a time and
 * applies the failover policy on every disconnect: transient -> reconnect the
 * same slot with exponential backoff; logout -> mark BANNED + rotate; backoff
 * exhausted / connect-timeout -> mark DEGRADED + rotate. When no eligible slot
 * remains it raises a sev-1 ALL_EXHAUSTED alert and stays alive, periodically
 * re-scanning so a backup the operator pairs later auto-recovers the feed.
 *
 * Pure decisions live in failoverPolicy/backoff/slotRegistry (unit-tested); this
 * is socket-wiring glue — excluded from coverage, verified in the integration run.
 *
 * @param {object} deps
 * @param {string[]} deps.slots - all configured slot labels (for UNREGISTERED marking)
 * @param {string} deps.targetGroupJid
 * @param {Function} deps.onMessage - the ingest orchestrator (processMessage)
 * @param {{info:Function,warn:Function,error:Function}} deps.logger
 * @param {{hset:Function}} deps.redis - ioredis (slot-state mirror)
 * @param {{raise:Function,clear:Function}} deps.alerter
 * @param {{sessionDirFor:Function,eligibleSlots:Function}} deps.registry
 * @param {Function} deps.connectionFactory - createConnection
 * @param {number} deps.loggedOutCode - DisconnectReason.loggedOut
 * @returns {{ start: () => void, stop: () => void }}
 */
function createNumberPool({
  slots,
  targetGroupJid,
  onMessage,
  logger,
  redis,
  alerter,
  registry,
  connectionFactory,
  loggedOutCode,
}) {
  const unavailable = new Set(); // slots BANNED/DEGRADED this run — never reselected
  let currentSlot = null;
  let currentSock = null;
  let attempt = 0; // consecutive transient retries on currentSlot
  let token = 0; // identifies the active connection attempt (dedupes stale callbacks)
  let connectTimer = null;
  let backoffTimer = null;
  let rescanTimer = null;
  let watchdogTimer = null;
  let stopped = false;
  let open = false; // true between onOpen and the next close — the watchdog only acts when open
  let lastActivityAt = 0; // epoch ms of the last inbound group message (stall watchdog, #16)

  /**
   * Stamp inbound activity, then delegate to the real ingest orchestrator. The
   * watchdog uses `lastActivityAt` to detect a silently-wedged OPEN socket.
   */
  async function trackedOnMessage(m) {
    lastActivityAt = Date.now();
    return onMessage(m);
  }

  /**
   * Mirror a slot's state into the easecab:bot:numbers hash (best-effort).
   * @param {string} slot
   * @param {string} state - a SLOT_STATE value
   * @param {number} [code] - last disconnect code
   */
  async function setSlotState(slot, state, code) {
    try {
      await redis.hset(
        BOT_NUMBERS_KEY,
        slot,
        JSON.stringify({ state, lastCode: code === undefined ? null : code, since: Date.now() }),
      );
    } catch (err) {
      logger.warn({ err: err.message, slot }, 'numberPool: failed to persist slot state');
    }
  }

  /** First eligible (paired) slot not banned/degraded this run, or null. */
  function pickAvailable() {
    return registry.eligibleSlots().find((s) => !unavailable.has(s)) || null;
  }

  /** Open a connection for a slot; wire lifecycle callbacks + connect timeout. */
  async function connectSlot(slot) {
    if (stopped) return;
    currentSlot = slot;
    open = false;
    const myToken = (token += 1);
    try {
      currentSock = await connectionFactory({
        sessionPath: registry.sessionDirFor(slot),
        targetGroupJid,
        onMessage: trackedOnMessage,
        logger,
        onOpen: () => {
          if (stopped || myToken !== token) return;
          clearTimeout(connectTimer);
          attempt = 0;
          open = true;
          lastActivityAt = Date.now(); // reset the stall window on a fresh open
          logger.info({ slot }, 'numberPool: slot active');
          setSlotState(slot, SLOT_STATE.ACTIVE);
        },
        onClose: (code) => {
          if (stopped || myToken !== token) return;
          open = false;
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
      try {
        if (currentSock) currentSock.end(undefined);
      } catch {
        // already closed
      }
      handleClose(undefined);
    }, BOT_HEALTH.CONNECT_TIMEOUT_MS);
  }

  /** Apply the failover policy for a closed/failed connection. */
  function handleClose(code) {
    if (stopped) return;
    attempt += 1;
    const decision = decideOnClose({
      code,
      attempt,
      maxAttempts: BACKOFF.MAX_ATTEMPTS,
      loggedOutCode,
    });

    if (decision.action === 'reconnect') {
      const delay = nextDelayMs(attempt);
      logger.warn({ slot: currentSlot, attempt, delay }, 'numberPool: reconnecting same slot after backoff');
      backoffTimer = setTimeout(() => connectSlot(currentSlot), delay);
      return;
    }

    const slot = currentSlot;
    if (decision.ban) {
      unavailable.add(slot);
      setSlotState(slot, SLOT_STATE.BANNED, code);
      alerter.raise(ALERT_EVENT.NUMBER_BANNED, ALERT_SEV.WARN, { slot });
    } else if (decision.degrade) {
      unavailable.add(slot);
      setSlotState(slot, SLOT_STATE.DEGRADED, code);
    }
    attempt = 0;
    rotate();
  }

  /** Move to the next available slot, or raise ALL_EXHAUSTED. */
  function rotate() {
    if (stopped) return;
    const next = pickAvailable();
    if (!next) {
      onExhausted();
      return;
    }
    logger.warn({ to: next }, 'numberPool: failing over to next slot');
    alerter.raise(ALERT_EVENT.FAILOVER, ALERT_SEV.WARN, { to: next });
    connectSlot(next);
  }

  /** No eligible slot left — feed is dark. Stay alive and re-scan for a paired backup. */
  function onExhausted() {
    currentSlot = null;
    currentSock = null;
    logger.error('numberPool: all numbers exhausted — feed is dark');
    alerter.raise(ALERT_EVENT.ALL_EXHAUSTED, ALERT_SEV.SEV1);
    if (rescanTimer) return;
    rescanTimer = setInterval(() => {
      if (stopped) return;
      const next = pickAvailable();
      if (next) {
        clearInterval(rescanTimer);
        rescanTimer = null;
        logger.info({ slot: next }, 'numberPool: a slot became available — recovering');
        alerter.clear(ALERT_EVENT.ALL_EXHAUSTED);
        connectSlot(next);
      }
    }, BOT_HEALTH.RESCAN_MS);
  }

  /**
   * Stall watchdog (#16): when the slot is OPEN but no inbound message has arrived
   * for STALL_WATCHDOG_MS, the socket has likely silently wedged (Baileys emits no
   * 'close'). Force-end it — that fires 'close' → onClose → handleClose → a transient
   * reconnect of the same slot. Bump lastActivityAt first so we don't re-fire before
   * the close lands. A forced reconnect during a genuinely quiet stretch is harmless.
   */
  function checkStall() {
    if (stopped || !open || !currentSock) return;
    if (Date.now() - lastActivityAt < BOT_HEALTH.STALL_WATCHDOG_MS) return;
    logger.warn(
      { slot: currentSlot, idleMs: Date.now() - lastActivityAt },
      'numberPool: inbound silence on an open socket — forcing reconnect (stall watchdog)',
    );
    open = false;
    lastActivityAt = Date.now();
    try {
      if (currentSock) currentSock.end(undefined);
    } catch {
      // already torn down — the close path will still run
    }
  }

  /** Begin supervising: mark unregistered slots, connect the first available. */
  function start() {
    const eligible = new Set(registry.eligibleSlots());
    for (const slot of slots) {
      if (!eligible.has(slot)) setSlotState(slot, SLOT_STATE.UNREGISTERED);
    }
    watchdogTimer = setInterval(checkStall, BOT_HEALTH.WATCHDOG_CHECK_MS);
    const first = pickAvailable();
    if (!first) {
      onExhausted();
      return;
    }
    connectSlot(first);
  }

  /** Stop supervising: cancel all timers and end the live socket. */
  function stop() {
    stopped = true;
    clearTimeout(connectTimer);
    clearTimeout(backoffTimer);
    if (rescanTimer) clearInterval(rescanTimer);
    if (watchdogTimer) clearInterval(watchdogTimer);
    try {
      if (currentSock) currentSock.end(undefined);
    } catch {
      // already closed
    }
  }

  return { start, stop };
}

module.exports = { createNumberPool };

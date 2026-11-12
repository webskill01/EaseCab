'use strict';

const { ALERT_EVENT, ALERT_SEV, BOT_HEALTH } = require('@easecab/shared');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // India Standard Time = UTC+5:30
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MIN_MS = 60 * 1000;

/**
 * How long a slot has been silent, counted only inside today's IST active window
 * (so a quiet night never carries into a 06:00 alert). 0 when the slot is not
 * supposed to be receiving (banned/degraded/paused) or outside active hours.
 * @param {{ live: boolean, lastMsgAt: ?number, startedAt: number, now: number }} args
 * @returns {number} ms of silence
 */
function silentForMs({ live, lastMsgAt, startedAt, now }) {
  if (!live) return 0;
  const istNow = now + IST_OFFSET_MS;
  const hour = new Date(istNow).getUTCHours();
  if (hour < BOT_HEALTH.ACTIVE_HOUR_START_IST || hour >= BOT_HEALTH.ACTIVE_HOUR_END_IST) return 0;
  const activeStart = now - (istNow % DAY_MS) + BOT_HEALTH.ACTIVE_HOUR_START_IST * HOUR_MS;
  return now - Math.max(lastMsgAt || startedAt, activeStart);
}

/**
 * Per-number silence alert. The stall watchdog reconnects a ghost device every
 * ~13 min and each reconnect marks it "active", so without this a number that
 * WhatsApp stopped delivering to stays quiet for days (FEED_STALE only fires when
 * EVERY number is quiet). Raises/clears only on a change of state.
 * @param {{ raise: Function, clear: Function }} alerter
 * @returns {{ check: Function, forget: (slot: string) => void }}
 */
function createSilenceWatch(alerter) {
  const silent = new Map(); // slot -> last reported state (unset = never reported this boot)
  const field = (slot) => `${ALERT_EVENT.SLOT_SILENT}:${slot}`;

  /** @param {string} slot @param {{live:boolean,lastMsgAt:?number,startedAt:number}} s @param {number} [now] */
  function check(slot, s, now = Date.now()) {
    const quietMs = silentForMs({ ...s, now });
    const isSilent = quietMs >= BOT_HEALTH.SLOT_SILENT_AFTER_MS;
    if (silent.get(slot) === isSilent) return;
    silent.set(slot, isSilent); // first check after boot also clears a leftover alert
    if (isSilent) alerter.raise(field(slot), ALERT_SEV.WARN, { slot, quietMin: Math.round(quietMs / MIN_MS) });
    else alerter.clear(field(slot));
  }

  /** Slot paused/removed: drop its alert so it never lingers. @param {string} slot */
  function forget(slot) {
    silent.delete(slot);
    alerter.clear(field(slot));
  }

  return { check, forget };
}

module.exports = { silentForMs, createSilenceWatch };

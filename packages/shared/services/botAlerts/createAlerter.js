'use strict';

const { BOT_ALERTS_KEY, ALERT_SEV } = require('../../constants/bot');

/**
 * Build an operational alerter for the bot feed (Phase 2.5 6c). Both
 * @easecab/bot (number bans / failover / all-exhausted) and the @easecab/api
 * cron stale watcher (feed-stale) raise through this so the alert surface has a
 * single shape. State is mirrored into the Redis hash `easecab:bot:alerts`
 * (field = event, value = {sev, since, detail}); a leveled log line is emitted
 * for the operator. SEV1 logs at error.
 *
 * Alerting must NEVER crash its caller — every Redis/log failure is swallowed.
 * Until the multi-channel path (WhatsApp/email) and Phase-7 in-panel badge land,
 * the Redis state + logs ARE the alert surface; later channels read this hash.
 *
 * @param {object} deps
 * @param {{ hset: Function, hdel: Function }} deps.redis - ioredis client
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {{ raise: (event: string, sev: string, detail?: object) => Promise<void>,
 *            clear: (event: string) => Promise<void> }}
 */
function createAlerter({ redis, logger }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  /**
   * Raise (or refresh) an alert: persist to Redis + log at a level matching sev.
   * @param {string} event - an ALERT_EVENT value
   * @param {string} sev - an ALERT_SEV value
   * @param {object} [detail] - small, PII-free context (e.g. { slot, reason })
   * @returns {Promise<void>}
   */
  async function raise(event, sev, detail) {
    const payload = { sev, since: Date.now(), detail: detail || null };
    try {
      await redis.hset(BOT_ALERTS_KEY, event, JSON.stringify(payload));
    } catch (err) {
      log.error({ err: err.message, event }, 'alerter: failed to persist alert state');
    }
    const line = sev === ALERT_SEV.SEV1 ? log.error : log.warn;
    line.call(log, { event, sev, detail: detail || undefined }, `ALERT ${event}`);
  }

  /**
   * Clear a previously-raised alert (the condition recovered).
   * @param {string} event - an ALERT_EVENT value
   * @returns {Promise<void>}
   */
  async function clear(event) {
    try {
      await redis.hdel(BOT_ALERTS_KEY, event);
    } catch (err) {
      log.error({ err: err.message, event }, 'alerter: failed to clear alert state');
      return;
    }
    log.info({ event }, `ALERT cleared ${event}`);
  }

  return { raise, clear };
}

module.exports = { createAlerter };

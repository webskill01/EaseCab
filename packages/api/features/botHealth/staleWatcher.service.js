'use strict';

const { ALERT_EVENT, ALERT_SEV } = require('@easecab/shared');
const { decideStale } = require('./staleDecision');

/**
 * Stale-feed watcher — the cron's business logic for Phase 2.5 6b. Each
 * `check()` reads the bot heartbeat, decides STALE via the pure decideStale, and
 * raises or clears the FEED_STALE alert accordingly. Runs on the cron interval
 * inside a long-lived worker, so it NEVER throws — a transient Redis error is
 * logged and swallowed (next tick retries).
 *
 * @param {object} deps
 * @param {{ getLastIngestAt(): Promise<?number> }} deps.repository
 * @param {{ raise: Function, clear: Function }} deps.alerter
 * @param {{ staleAfterMin:number, activeStartHourIST:number, activeEndHourIST:number, feedEnabled:boolean }} deps.config
 * @param {() => number} [deps.clock] - epoch-ms now (tests pin it)
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {{ check(): Promise<?{stale:boolean, reason:string}> }}
 */
function createStaleWatcher({ repository, alerter, config, clock, logger }) {
  const now = clock || (() => Date.now());
  const log = logger || { info() {}, warn() {}, error() {} };

  /**
   * Run one staleness check. Returns the decision, or null if it failed.
   * @returns {Promise<?{stale:boolean, reason:string}>}
   */
  async function check() {
    try {
      const lastIngestAt = await repository.getLastIngestAt();
      const decision = decideStale({
        lastIngestAt,
        now: now(),
        staleAfterMin: config.staleAfterMin,
        activeStartHourIST: config.activeStartHourIST,
        activeEndHourIST: config.activeEndHourIST,
        feedEnabled: config.feedEnabled,
      });

      if (decision.stale) {
        await alerter.raise(ALERT_EVENT.FEED_STALE, ALERT_SEV.WARN, { reason: decision.reason });
      } else {
        await alerter.clear(ALERT_EVENT.FEED_STALE);
      }
      return decision;
    } catch (err) {
      log.error({ err: err.message }, 'stale watcher check failed; will retry next tick');
      return null;
    }
  }

  return { check };
}

module.exports = { createStaleWatcher };

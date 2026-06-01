'use strict';

const { BOT_LAST_INGEST_KEY } = require('@easecab/shared');

/**
 * Build the ingestion heartbeat (Phase 2.5 6b). `record()` stamps the time of
 * the latest successful ride write into Redis so the (out-of-process) cron stale
 * watcher can tell "feed is down" from "group is just quiet". Best-effort: a
 * Redis failure is swallowed — a missed heartbeat must never break ingestion.
 *
 * @param {object} deps
 * @param {{ set: Function }} deps.redis - ioredis client
 * @param {{ now: () => number }} [deps.clock] - injectable for tests
 * @param {{ warn?: Function }} [deps.logger]
 * @returns {{ record: () => Promise<void> }}
 */
function createHeartbeat({ redis, clock = { now: () => Date.now() }, logger }) {
  const log = logger || { warn() {} };

  /**
   * Stamp the current time as the last successful ingest.
   * @returns {Promise<void>}
   */
  async function record() {
    try {
      await redis.set(BOT_LAST_INGEST_KEY, String(clock.now()));
    } catch (err) {
      log.warn({ err: err.message }, 'heartbeat: failed to record last_ingest_at');
    }
  }

  return { record };
}

module.exports = { createHeartbeat };

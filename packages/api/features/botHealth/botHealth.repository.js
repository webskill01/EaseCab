'use strict';

const { BOT_LAST_INGEST_KEY } = require('@easecab/shared');

/**
 * Bot-health repository — the cron's read-only window into the bot's Redis
 * heartbeat (Phase 2.5 6b). Repository layer: Redis access only, no logic.
 *
 * @param {object} deps
 * @param {{ get: Function }} deps.redis - ioredis client
 * @returns {{ getLastIngestAt(): Promise<?number> }}
 */
function createBotHealthRepository({ redis }) {
  /**
   * Epoch-ms of the last successful ride write, or null if never/unparseable.
   * @returns {Promise<?number>}
   */
  async function getLastIngestAt() {
    const raw = await redis.get(BOT_LAST_INGEST_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  return { getLastIngestAt };
}

module.exports = { createBotHealthRepository };

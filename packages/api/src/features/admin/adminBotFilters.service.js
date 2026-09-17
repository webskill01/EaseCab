'use strict';

const {
  AppError, ERROR_CODES, HTTP_STATUS, BOT_FILTERS_CHANGED_CHANNEL,
  BOT_FILTER_REQUIRED_LISTS, BOT_FILTER_NUMBER_LISTS, FLEET_FIELDS, parseNumbers,
} = require('@easecab/shared');

// our list → { field, addPath, bodyKey } in the fleet panel protocol.
const FLEET_BY_LIST = Object.freeze(Object.fromEntries(
  Object.entries(FLEET_FIELDS).map(([field, spec]) => [spec.list, { field, ...spec }]),
));
/**
 * Turn raw admin input into the values stored for `list`. Number lists accept any
 * written phone format (parseNumbers); everything else is stored trimmed, exactly as
 * typed — the fleet keeps ignore phrases that way ("AVELEBAL"), and the bot matches
 * case-insensitively anyway.
 * @returns {{ values: string[], invalid: string[] }}
 */
function normalize(list, value) {
  if (BOT_FILTER_NUMBER_LISTS.includes(list)) {
    const { numbers, invalid } = parseNumbers(value);
    if (numbers.length === 0) {
      throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR, 'No valid 10-digit phone number found.');
    }
    return { values: [...new Set(numbers)], invalid };
  }
  return { values: [value.trim()], invalid: [] };
}

/**
 * Admin bot-filter business logic (Phase 17.4/17.5). Every write publishes on
 * BOT_FILTERS_CHANGED_CHANNEL so easecab-bot hot-reloads, and admin writes to a
 * fleet-shared list are replayed to the fleet control panels. Writes that ARRIVE
 * from a panel pass `{ mirror: false }` so they are not bounced back.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminBotFilters.repository').createAdminBotFiltersRepository>} deps.repo
 * @param {import('ioredis').Redis} deps.redis
 * @param {{ warn: Function }} deps.logger
 * @param {ReturnType<import('../../lib/fleetMirror').createFleetMirror>} [deps.fleet]
 */
function createAdminBotFiltersService({ repo, redis, logger, fleet }) {
  /** Best-effort: the bot also reloads every 5 min, so a lost publish only delays. */
  async function notifyBot(list) {
    try {
      await redis.publish(BOT_FILTERS_CHANGED_CHANNEL, list);
    } catch (err) {
      logger.warn({ err: err.message }, 'bot filter change publish failed; bot picks it up on its next refresh');
    }
  }

  /** Replay to the fleet panels when this list is fleet-shared and mirroring is on. */
  async function toFleet(list, mirror, path, body) {
    if (!mirror || !fleet || !FLEET_BY_LIST[list]) return [];
    const results = await fleet.post(path, body);
    for (const r of results.filter((x) => !x.ok)) {
      logger.warn({ peer: r.peer, path, err: r.error }, 'fleet panel did not accept bot filter change');
    }
    return results;
  }

  async function deleteRow(row, mirror) {
    if (BOT_FILTER_REQUIRED_LISTS.includes(row.list) && (await repo.countByList(row.list)) <= 1) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'This list cannot be empty.', HTTP_STATUS.CONFLICT);
    }
    await repo.remove(row.id);
    await notifyBot(row.list);
    const spec = FLEET_BY_LIST[row.list];
    const peers = await toFleet(row.list, mirror, '/api/block/remove', spec && { field: spec.field, value: row.value });
    return { id: row.id, peers };
  }

  return {
    /** Offset-paginated entries of one list, newest first. */
    async list({ list, page, limit, q }) {
      const { rows, total } = await repo.list({ list, page, limit, q });
      return { items: rows, total, page, limit };
    },

    /**
     * Add entries; duplicates are skipped, not errors. Replayed to the fleet even
     * when nothing was new here, since a peer may still be missing it.
     * @returns {Promise<{ added: number, duplicates: number, invalid: string[], peers: object[] }>}
     */
    async add({ list, value }, { mirror = true } = {}) {
      const { values, invalid } = normalize(list, value);
      // A phrase already present in another case ("Free" vs "free") is a duplicate, like the fleet.
      const isNumbers = BOT_FILTER_NUMBER_LISTS.includes(list);
      const existing = !isNumbers && (await repo.findByValue(list, values[0]));
      const added = existing ? 0 : await repo.createMany(list, values);
      if (added > 0) await notifyBot(list);
      const spec = FLEET_BY_LIST[list];
      const peers = await toFleet(list, mirror, spec && spec.addPath, spec && { [spec.bodyKey]: values.join(', ') });
      return { added, duplicates: values.length - added, invalid, peers };
    },

    /** Delete by id. Refuses the last entry of a required list (the bot would stop). */
    async remove(id, { mirror = true } = {}) {
      const row = await repo.findById(id);
      if (!row) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      return deleteRow(row, mirror);
    },

    /** Delete by value (fleet protocol). A value we don't have is a no-op, like the fleet. */
    async removeByValue(list, value, { mirror = true } = {}) {
      const values = BOT_FILTER_NUMBER_LISTS.includes(list) ? parseNumbers(value).numbers : [value.trim()];
      const row = values.length === 1 ? await repo.findByValue(list, values[0]) : null;
      if (!row) return { removed: 0, peers: [] };
      const { peers } = await deleteRow(row, mirror);
      return { removed: 1, peers };
    },
  };
}

module.exports = { createAdminBotFiltersService };

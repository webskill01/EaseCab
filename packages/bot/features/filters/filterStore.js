'use strict';

const { BOT_FILTER_LIST, BOT_FILTER_REQUIRED_LISTS } = require('@easecab/shared');

// bot_filter_entries.list → the key processMessage reads.
const KEY_FOR_LIST = Object.freeze({
  [BOT_FILTER_LIST.RIDE_KEYWORD]: 'rideKeywords',
  [BOT_FILTER_LIST.IGNORE_KEYWORD]: 'ignoreKeywords',
  [BOT_FILTER_LIST.BLOCKED_PHONE]: 'blockedPhoneNumbers',
  [BOT_FILTER_LIST.BLOCKED_SENDER]: 'blockedSenders',
  [BOT_FILTER_LIST.BRANDING]: 'knownBrandings',
});

/**
 * Group bot_filter_entries rows into the filter shape processMessage consumes.
 * @param {{ list: string, value: string }[]} rows
 * @returns {{ rideKeywords: string[], ignoreKeywords: string[], blockedPhoneNumbers: string[], blockedSenders: string[], knownBrandings: string[] }}
 * @throws {Error} when a required list is empty (fail closed)
 */
function buildFilters(rows) {
  const filters = Object.fromEntries(Object.values(KEY_FOR_LIST).map((k) => [k, []]));
  for (const { list, value } of rows) {
    if (KEY_FOR_LIST[list]) filters[KEY_FOR_LIST[list]].push(value);
  }
  for (const list of BOT_FILTER_REQUIRED_LISTS) {
    if (filters[KEY_FOR_LIST[list]].length === 0) {
      throw new Error(`bot filter list ${list} is empty — refusing to run without it`);
    }
  }
  return filters;
}

/**
 * Hot-reloadable filter lists backed by bot_filter_entries. `filters` is one
 * stable object whose arrays are replaced on reload, so processMessage (which
 * reads it per message) always sees the latest lists without re-wiring.
 * @param {{ prisma: object, logger: { info: Function, warn: Function } }} deps
 * @returns {{ filters: object, start: () => Promise<void>, reload: () => Promise<void> }}
 */
function createFilterStore({ prisma, logger }) {
  const filters = {};

  async function load() {
    const rows = await prisma.botFilterEntry.findMany({ select: { list: true, value: true } });
    Object.assign(filters, buildFilters(rows));
    logger.info({ count: rows.length }, 'bot filters loaded');
  }

  return {
    filters,
    // Startup: any failure propagates so the process exits instead of ingesting unfiltered.
    start: load,
    // Hot reload: a failure keeps the last good lists.
    async reload() {
      try {
        await load();
      } catch (err) {
        logger.warn({ err: err.message }, 'bot filter reload failed; keeping previous lists');
      }
    },
  };
}

module.exports = { buildFilters, createFilterStore };

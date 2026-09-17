'use strict';

/**
 * Fleet-wide "Forwarded Duty" stamps, copied verbatim from the fleet's
 * core/globalConfig.js `knownBrandings` (oracle-v2 and multibot are identical).
 * Fleet bots post into our source group and each appends one of these, so the
 * bot strips them before fingerprinting — otherwise the same ride forwarded by
 * two bots hashes twice and the stamp shows in the feed. Keep in sync with the
 * fleet. Since Phase 17.3 the live list is the `branding` rows in
 * bot_filter_entries (seeded from this); this is the fallback default.
 */
const KNOWN_BRANDINGS = Object.freeze([
  // oracle-v2 (bot-taxi)
  "- 🚨 Forwarded Duty 🚨",
  "- 📢 Forward Duty 📢",
  "- 🚨 Forwarded ਡਿਊਟੀ 🚨",
  // bot-delhi
  "- 🚕 Forwarded Duty 🚕",
  "- 🚕 Duty Forwarded 🚕",
  "- 🚕 Forwarded ਡਿਊਟੀ 🚕",
  "- 🔔 Forwarded Duty 🔔",
  "- 🔔 Duty Forwarded 🔔",
  "- 🔔 Forwarded ਡਿਊਟੀ 🔔",
  // bot-sachin
  "- 🚗 Forwarded Duty 🚗",
  "- 🚗 Duty Forwarded 🚗",
  "- 🚗 Forwarded ਡਿਊਟੀ 🚗",
  "- ⭐ Forwarded Duty ⭐",
  "- ⭐ Duty Forwarded ⭐",
  "- ⭐ Forwarded ਡਿਊਟੀ ⭐",
  // bot-aayush
  "- 📍 Forwarded Duty 📍",
  "- 📍 Duty Forwarded 📍",
  "- 📍 Forwarded ਡਿਊਟੀ 📍",
  "- 🚙 Forwarded Duty 🚙",
  "- 🚙 Duty Forwarded 🚙",
  "- 🚙 Forwarded ਡਿਊਟੀ 🚙",
]);

/** bot_filter_entries.list values (Prisma enum BotFilterList). */
const BOT_FILTER_LIST = Object.freeze({
  RIDE_KEYWORD: 'ride_keyword',
  IGNORE_KEYWORD: 'ignore_keyword',
  BLOCKED_PHONE: 'blocked_phone',
  BLOCKED_SENDER: 'blocked_sender',
  BRANDING: 'branding',
});

/**
 * Lists that must never be empty: with no accept or reject words the bot would
 * forward spam into the paid feed. The bot refuses to load without them and the
 * admin API refuses to delete their last entry.
 */
const BOT_FILTER_REQUIRED_LISTS = Object.freeze([BOT_FILTER_LIST.RIDE_KEYWORD, BOT_FILTER_LIST.IGNORE_KEYWORD]);

/** Lists whose entries are phone numbers, parsed with parseNumbers on add. */
const BOT_FILTER_NUMBER_LISTS = Object.freeze([BOT_FILTER_LIST.BLOCKED_PHONE, BOT_FILTER_LIST.BLOCKED_SENDER]);

/**
 * Fleet control-panel field names (core/blocked-data.json) → our list, and the
 * panel endpoint that adds to each (Phase 17.5 peer sync). Ride keywords and
 * stamps live in the fleet's globalConfig, not its panel, so they don't sync.
 */
const FLEET_FIELDS = Object.freeze({
  blockedPhoneNumbers: Object.freeze({ list: BOT_FILTER_LIST.BLOCKED_PHONE, addPath: '/api/block/number', bodyKey: 'input' }),
  blockedSenders: Object.freeze({ list: BOT_FILTER_LIST.BLOCKED_SENDER, addPath: '/api/block/sender', bodyKey: 'input' }),
  ignoreIfContains: Object.freeze({ list: BOT_FILTER_LIST.IGNORE_KEYWORD, addPath: '/api/block/ignore', bodyKey: 'phrase' }),
});

/** Inbound fleet API: after MAX_FAILURES bad tokens from one IP, refuse it for the rest of the window. */
const FLEET_SYNC_AUTH = Object.freeze({ MAX_FAILURES: 20, WINDOW_SEC: 3600 });

module.exports = {
  KNOWN_BRANDINGS, BOT_FILTER_LIST, BOT_FILTER_REQUIRED_LISTS, BOT_FILTER_NUMBER_LISTS, FLEET_FIELDS, FLEET_SYNC_AUTH,
};

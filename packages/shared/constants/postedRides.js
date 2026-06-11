'use strict';

/**
 * App-native posted-ride bounds (Step 13). TTL is the 24h feed/contact window;
 * FEED bounds mirror RIDES_FEED for the cursor list; MINE_LIMIT caps the
 * (per-user, small) My Rides list; NOTES_MAX bounds the free-text note;
 * PARSE_TEXT_MAX bounds the pasted WhatsApp message for the free-text parser
 * (Step 20) — comfortably above a real lead, below abuse size.
 */
const POSTED_RIDES = Object.freeze({
  TTL_HOURS: 24,
  FEED: Object.freeze({ DEFAULT_LIMIT: 20, MAX_LIMIT: 50 }),
  MINE_LIMIT: 50,
  NOTES_MAX: 500,
  PARSE_TEXT_MAX: 2000,
});

module.exports = { POSTED_RIDES };

'use strict';

/**
 * App-native posted-ride bounds (Step 13). TTL is the 24h feed/contact window;
 * FEED bounds mirror RIDES_FEED for the cursor list; MINE_LIMIT caps the
 * (per-user, small) My Rides list; NOTES_MAX bounds the free-text note.
 */
const POSTED_RIDES = Object.freeze({
  TTL_HOURS: 24,
  FEED: Object.freeze({ DEFAULT_LIMIT: 20, MAX_LIMIT: 50 }),
  MINE_LIMIT: 50,
  NOTES_MAX: 500,
});

module.exports = { POSTED_RIDES };

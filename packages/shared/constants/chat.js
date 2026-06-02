'use strict';

/**
 * In-app chat bounds (Step 14). MESSAGES bounds the cursor-paginated message
 * history page (mirrors RIDES_FEED); MINE_LIMIT caps the per-user chat list
 * (small); TEXT_MAX bounds a single text message body. Image messages are
 * deferred to R2 presign (Step 22) — text-only for now.
 */
const CHAT = Object.freeze({
  MESSAGES: Object.freeze({ DEFAULT_LIMIT: 30, MAX_LIMIT: 50 }),
  MINE_LIMIT: 50,
  TEXT_MAX: 2000,
});

module.exports = { CHAT };

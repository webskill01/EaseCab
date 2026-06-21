'use strict';

/**
 * In-app chat bounds (Step 14). MESSAGES bounds the cursor-paginated message
 * history page (mirrors RIDES_FEED); MINE_LIMIT caps the per-user chat list
 * (small); TEXT_MAX bounds a single text message body. Image messages (P12-2) carry
 * an R2 attachment instead of text (size capped by UPLOAD_PURPOSE.chat_image).
 *
 * PRESENCE (P12-8): while a thread is open the client beats `HEARTBEAT_MS` to the API,
 * which stamps the caller's role lastActiveAt on the chat doc. The other party reads it
 * via the existing chat-doc subscription and treats it as "online" when within
 * `ONLINE_WINDOW_MS` (> heartbeat, so one dropped beat doesn't flip offline), else
 * "last seen". No onDisconnect — offline is inferred from a stale stamp.
 */
const CHAT = Object.freeze({
  MESSAGES: Object.freeze({ DEFAULT_LIMIT: 30, MAX_LIMIT: 50 }),
  MINE_LIMIT: 50,
  TEXT_MAX: 2000,
  PRESENCE: Object.freeze({ HEARTBEAT_MS: 30000, ONLINE_WINDOW_MS: 60000 }),
});

module.exports = { CHAT };

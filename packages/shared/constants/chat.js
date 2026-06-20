'use strict';

/**
 * In-app chat bounds (Step 14). MESSAGES bounds the cursor-paginated message
 * history page (mirrors RIDES_FEED); MINE_LIMIT caps the per-user chat list
 * (small); TEXT_MAX bounds a single text message body. Image messages (P12-2) carry
 * an R2 attachment instead of text (size capped by UPLOAD_PURPOSE.chat_image).
 */
const CHAT = Object.freeze({
  MESSAGES: Object.freeze({ DEFAULT_LIMIT: 30, MAX_LIMIT: 50 }),
  MINE_LIMIT: 50,
  TEXT_MAX: 2000,
});

module.exports = { CHAT };

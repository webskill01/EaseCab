'use strict';

/**
 * WhatsApp group-link catcher (Phase 29). easecab-bot pulls chat.whatsapp.com invite
 * links out of every group message on every session; one row per invite code, however
 * many times or places it is spammed. The admin Group Links page joins or avoids them.
 */
const WA_INVITE_STATUS = Object.freeze({
  NEW: 'new',
  JOINED: 'joined', // a bot session is in the group (set by the bot)
  AVOIDED: 'avoided', // admin said no; never shown as new again
  INVALID: 'invalid', // WhatsApp says the link is revoked / gone
});

const WA_INVITES = Object.freeze({
  // Invite codes are 20-24 base62 chars; anything else after chat.whatsapp.com
  // (instagram links pasted next to it, channel links) never matches.
  CODE_RE: /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})(?![0-9A-Za-z])/g,
  URL_PREFIX: 'https://chat.whatsapp.com/',
  // Same code seen again within this window (other session, same spam burst) → no DB write.
  RESEEN_WINDOW_MS: 60 * 60 * 1000,
  SEEN_CACHE_MAX: 5000,
  // Group-preview lookups (name, size, group id) go one at a time, this far apart, per bot.
  RESOLVE_GAP_MS: 20 * 1000,
  RESOLVE_QUEUE_MAX: 200,
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
});

/** Every distinct invite code in a message, in order. @param {string} text @returns {string[]} */
function extractInviteCodes(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(WA_INVITES.CODE_RE)) out.add(m[1]);
  return [...out];
}

module.exports = { WA_INVITE_STATUS, WA_INVITES, extractInviteCodes };

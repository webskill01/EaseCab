'use strict';
const { phoneRegex } = require('./extractPhone');

const BLOCK = '████████';

/**
 * Mask every phone-shaped run (and the known bare number) in display text so a
 * phone number is never persisted to / shown in `display_text` (CLAUDE.md §10).
 * @param {string} text - raw message text
 * @param {string} [phone] - the already-extracted bare 10-digit number
 * @returns {string} text with phone runs replaced by a fixed-width block
 */
function maskPhone(text, phone) {
  if (!text) return text;
  let out = text.replace(phoneRegex(), BLOCK);
  if (phone) {
    out = out.split(phone).join(BLOCK);
  }
  return out;
}

module.exports = { maskPhone };

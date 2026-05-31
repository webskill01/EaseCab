'use strict';

/**
 * Phone-shaped token: an Indian mobile (starts 6-9, 10 digits), allowing one
 * optional +91 / 91 / 0 prefix and a single space or dash splitting the two
 * 5-digit halves. Negative look-around stops it grabbing part of a longer
 * digit run (booking IDs, amounts). Used by both extractPhone and maskPhone.
 * @returns {RegExp} a fresh global regex (callers mutate lastIndex)
 */
function phoneRegex() {
  return /(?<!\d)(?:\+?91[\s-]?|0)?([6-9]\d{4}[\s-]?\d{5})(?!\d)/g;
}

/**
 * Extract the primary (first) Indian mobile number from a message.
 * @param {string} text - raw message text
 * @returns {string|null} the 10-digit number (separators stripped), or null
 */
function extractPhone(text) {
  if (!text) return null;
  const re = phoneRegex();
  const match = re.exec(text);
  if (!match) return null;
  const digits = match[1].replace(/[\s-]/g, '');
  return digits.length === 10 ? digits : null;
}

module.exports = { extractPhone, phoneRegex };

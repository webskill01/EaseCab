'use strict';

// Unicode digit forms common on Indian WhatsApp. `\d` is ASCII-only without the
// `u` flag, so these would otherwise be stripped — letting a blocked number
// written in Devanagari/Arabic numerals bypass the blocklist. Each block is a
// contiguous 0..9 run, so the digit value is codePoint minus the block's base.
const UNICODE_DIGIT_BASES = [
  0x0660, // Arabic-Indic ٠-٩
  0x06f0, // Extended Arabic-Indic (Persian) ۰-۹
  0x0966, // Devanagari ०-९
  0xff10, // Fullwidth ０-９
];
const UNICODE_DIGITS = /[٠-٩۰-۹०-९０-９]/g;

/**
 * Fold one Unicode digit char to its ASCII equivalent.
 * @param {string} ch
 * @returns {string}
 */
function foldDigit(ch) {
  const cp = ch.codePointAt(0);
  for (const base of UNICODE_DIGIT_BASES) {
    if (cp >= base && cp <= base + 9) return String(cp - base);
  }
  return ch;
}

/**
 * Reduce any phone-ish string to its ASCII digits, folding Unicode digit forms
 * to ASCII first so they cannot evade matching.
 * @param {string} value
 * @returns {string}
 */
function digitsOnly(value) {
  return (value || '').replace(UNICODE_DIGITS, foldDigit).replace(/\D/g, '');
}

/**
 * True if the message text contains any blocked number — ported from multibot
 * `containsBlockedNumber`. Matches the bare number and its "91"-prefixed form.
 * @param {string} text - raw message text
 * @param {string[]} blockedNumbers - bare numbers (any format)
 * @returns {boolean}
 */
function containsBlockedNumber(text, blockedNumbers) {
  if (!text || !blockedNumbers || blockedNumbers.length === 0) return false;
  const textDigits = digitsOnly(text);

  for (const blocked of blockedNumbers) {
    const norm = digitsOnly(blocked);
    if (!norm) continue;
    if (textDigits.includes(norm)) return true;
    if (textDigits.includes('91' + norm)) return true;
  }
  return false;
}

/**
 * True if the sender JID belongs to a blocked number. Strips the JID to digits
 * and compares its last 10 against the blocklist (normalized to last 10).
 * @param {string} jid - e.g. "919876543210@s.whatsapp.net"
 * @param {string[]} blockedSenders - bare numbers (any format)
 * @returns {boolean}
 */
function isBlockedSender(jid, blockedSenders) {
  if (!jid || !blockedSenders || blockedSenders.length === 0) return false;
  const senderLast10 = digitsOnly(jid).slice(-10);
  if (senderLast10.length < 10) return false;

  return blockedSenders.some((b) => digitsOnly(b).slice(-10) === senderLast10);
}

/**
 * True when a ride's pickup is a muted location. Matches the resolved city's
 * canonical name exactly (so an alias like "Bombay" hits a muted "Mumbai"), or
 * the muted word as a whole word inside the raw pickup ("Pune Station" hits "pune").
 * @param {{ raw: ?string, name: ?string }} pickup
 * @param {string[]} mutedPickups
 * @returns {boolean}
 */
function isMutedPickup({ raw, name }, mutedPickups) {
  if (!mutedPickups || mutedPickups.length === 0) return false;
  const canon = (name || '').toLowerCase();
  const rawLower = (raw || '').toLowerCase();
  return mutedPickups.some((m) => {
    const word = m.trim().toLowerCase();
    if (!word) return false;
    if (word === canon) return true;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(rawLower);
  });
}

module.exports = { containsBlockedNumber, isBlockedSender, isMutedPickup };

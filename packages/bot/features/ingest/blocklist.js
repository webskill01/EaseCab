'use strict';

/**
 * Reduce any phone-ish string to its digits.
 * @param {string} value
 * @returns {string}
 */
function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
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

module.exports = { containsBlockedNumber, isBlockedSender };

'use strict';

// First code point of each non-ASCII 0-9 run seen on Indian WhatsApp:
// Arabic-Indic, Extended Arabic-Indic, Devanagari, Gurmukhi, Fullwidth.
const DIGIT_BASES = [0x0660, 0x06f0, 0x0966, 0x0a66, 0xff10];
const UNICODE_DIGIT = /[٠-٩۰-۹०-९੦-੯０-９]/g;

// Characters that may sit INSIDE one written number: digits, spaces, + - . ( ).
// Anything else (comma, ; / |, letters, colon) separates numbers.
const SEPARATOR = /[^\d\s+\-.()]+/;

/** @param {string} ch @returns {string} */
function foldDigit(ch) {
  const cp = ch.codePointAt(0);
  const base = DIGIT_BASES.find((b) => cp >= b && cp <= b + 9);
  return base === undefined ? ch : String(cp - base);
}

/**
 * The bare 10-digit number `buf` spells, or null if it is not (yet) complete.
 * Accepts 10 digits, 0 + 10, 91 + 10, 091 + 10 and 0091 + 10.
 * @param {string} buf
 * @returns {string|null}
 */
function complete(buf) {
  if (buf.length === 10 && !buf.startsWith('0')) return buf;
  if (buf.length === 11 && buf.startsWith('0') && !buf.startsWith('00')) return buf.slice(1);
  if (buf.length === 12 && buf.startsWith('91')) return buf.slice(2);
  if (buf.length === 13 && buf.startsWith('091')) return buf.slice(3);
  if (buf.length === 14 && buf.startsWith('0091')) return buf.slice(4);
  return null;
}

/**
 * Parse admin input into bare 10-digit numbers. A superset of the fleet's
 * core/blockData.js parseNumbers: also folds Indian/Arabic/fullwidth digits,
 * splits on ; / | and words, and understands 0091 / 091 prefixes.
 * @param {string} input
 * @returns {{ numbers: string[], invalid: string[] }}
 */
function parseNumbers(input) {
  const numbers = [];
  const invalid = [];
  for (const group of String(input).replace(UNICODE_DIGIT, foldDigit).split(SEPARATOR)) {
    const chunks = group.split(/\D+/).filter(Boolean);
    let buf = '';
    chunks.forEach((chunk, i) => {
      buf += chunk;
      const next = chunks[i + 1] || '';
      // "91 98 76 54 32 10": at 10 digits a 91 prefix may still be growing into 91 + 10.
      const prefixStillGrowing = buf.length === 10 && buf.startsWith('91') && buf.length + next.length === 12;
      const number = prefixStillGrowing ? null : complete(buf);
      if (number) {
        numbers.push(number);
        buf = '';
      } else if (buf.length > 14) {
        invalid.push(buf);
        buf = '';
      }
    });
    if (buf) invalid.push(buf);
  }
  return { numbers, invalid };
}

module.exports = { parseNumbers };

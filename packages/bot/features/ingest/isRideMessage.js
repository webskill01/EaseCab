'use strict';
const { normalizeText } = require('./extractCities');

// Route shapes that mark a message as a ride even without an explicit keyword.
// Ported verbatim from multibot core/filter.js ROUTE_PATTERNS.
const ROUTE_PATTERNS = [
  /\bfrom\b.+\bto\b/i,
  /\bto\b.+\bfrom\b/i,
  /\b\w+\s+to\s+\w+/i,
  /\b\w+\s+drop\s+\w+/i,
  /\bcurrent\s+\w+/i,
  /pickup/i,
  /drop/i,
];

/**
 * Ride-message gate — ports multibot `isTaxiRequest`. Rejects if any ignore
 * keyword is present (Unicode-aware word boundary for non-ASCII ignore words);
 * otherwise accepts if a ride keyword or a route pattern is present.
 * @param {string} text - raw message text
 * @param {{ rideKeywords: string[], ignoreKeywords: string[] }} cfg
 * @returns {boolean}
 */
function isRideMessage(text, cfg) {
  if (!text) return false;
  const rideKeywords = (cfg && cfg.rideKeywords) || [];
  const ignoreKeywords = (cfg && cfg.ignoreKeywords) || [];

  const normalized = normalizeText(text);
  const originalLower = text.toLowerCase();

  // Strip WhatsApp formatting (* ` ~ _) → space (not empty) to preserve word
  // boundaries. _ is a regex word char, so _free_ would bypass \b without this.
  const cleanedText = originalLower.replace(/[*`~]/g, ' ').replace(/_/g, ' ');

  for (const ignoreWord of ignoreKeywords) {
    const ignoreWordLower = ignoreWord.toLowerCase();

    if (ignoreWordLower.includes(' ')) {
      if (cleanedText.includes(ignoreWordLower)) {
        return false;
      }
    } else {
      const escaped = ignoreWordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hasNonAscii = [...ignoreWordLower].some((ch) => ch.codePointAt(0) > 127);

      if (hasNonAscii) {
        // \b is ASCII-only; use Unicode letter/number boundaries (needs `u`).
        const unicodeBoundary = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u');
        if (unicodeBoundary.test(cleanedText)) {
          return false;
        }
      } else {
        const wordBoundary = new RegExp(`\\b${escaped}\\b`, 'i');
        if (wordBoundary.test(cleanedText)) {
          return false;
        }
      }
    }
  }

  const hasKeyword = rideKeywords.some((k) => normalized.includes(k.toLowerCase()));
  const hasRoute = ROUTE_PATTERNS.some((p) => p.test(normalized));

  return hasKeyword || hasRoute;
}

module.exports = { isRideMessage, ROUTE_PATTERNS };

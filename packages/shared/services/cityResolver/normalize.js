'use strict';

/**
 * Normalize a raw WhatsApp city/message string for matching and as a Redis cache
 * key. Ported from oracle-v2 `core/filter.js normalizeText` (read-only reference —
 * oracle-v2 is never modified, CLAUDE.md §3). Strips emoji unicode blocks and
 * WhatsApp formatting, collapses whitespace, lowercases, trims.
 *
 * @param {string} text - raw input
 * @returns {string} normalized text, or '' for empty/non-string input
 */
function normalizeCityText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport & map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // regional indicators
    .replace(/[\u{1F100}-\u{1F1DF}]/gu, '') // enclosed alphanumeric supplement
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // variation selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // supplemental symbols
    .replace(/[*_`~]/g, '') // WhatsApp bold/italic/code/strikethrough
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

module.exports = { normalizeCityText };

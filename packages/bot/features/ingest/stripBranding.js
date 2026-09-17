'use strict';

const { KNOWN_BRANDINGS } = require('@easecab/shared');

/**
 * Remove trailing fleet "Forwarded Duty" stamps, peeling repeatedly so a ride
 * that hopped through several bots loses every stamp. Same algorithm as the
 * fleet's router.js stripBranding, so all bots fingerprint the same base text.
 * @param {string} text - raw WhatsApp message text
 * @param {readonly string[]} [variants=KNOWN_BRANDINGS] - stamps to strip
 * @returns {string} text with trailing stamps and trailing whitespace removed
 */
function stripBranding(text, variants = KNOWN_BRANDINGS) {
  let base = (text || '').replace(/\s+$/, '');
  let peeled = true;
  while (peeled) {
    peeled = false;
    for (const v of variants) {
      if (v && base.endsWith(v)) {
        base = base.slice(0, -v.length).replace(/\s+$/, '');
        peeled = true;
      }
    }
  }
  return base;
}

module.exports = { stripBranding };

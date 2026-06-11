'use strict';

/**
 * @easecab/shared/parsing — pure WhatsApp ride-message extractors (promoted from
 * packages/bot in Step 20 so api + bot share one source of truth). No I/O.
 */
module.exports = {
  ...require('./extractCities'),
  ...require('./extractPhone'),
};

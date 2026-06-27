'use strict';

/**
 * Public-profile view anti-scrape limit (security-review M3). The poster profile
 * endpoint exposes display data by design, but an uncapped crawl lets one account
 * harvest the whole driver directory — so cap reveals per viewer per fixed window.
 */
const PROFILE_VIEW_RATE_LIMIT = Object.freeze({
  MAX_PER_WINDOW: 60, // profile views allowed per viewer per window
  WINDOW_SEC: 60,
});

module.exports = { PROFILE_VIEW_RATE_LIMIT };

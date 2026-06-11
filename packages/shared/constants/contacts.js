'use strict';

/** Which feed a recorded contact came from — stored on RideContact so the contacted
 * list survives the source ride's hard-delete (Step 19 snapshot). */
const CONTACT_SOURCE = Object.freeze({ BOT: 'bot', POSTED: 'posted' });

/** My-Rides "Contacted" list bounds (cursor pagination, mirrors RIDES_FEED). */
const CONTACTED = Object.freeze({ FEED: Object.freeze({ DEFAULT_LIMIT: 20, MAX_LIMIT: 50 }) });

module.exports = { CONTACT_SOURCE, CONTACTED };

'use strict';

/**
 * Push notification bounds + copy (Step 15). `notificationCities` (a City-UUID
 * opt-in list on the user) is the targeting key; PUSH_SOURCE discriminates which
 * per-source toggle a new-ride event honours (notifyBotRides / notifyPostedRides).
 *
 * Notification copy is English-only for the MVP — server-side push localization
 * (per-user locale) is deferred; the JSX-only i18n rule (CLAUDE.md §14) does not
 * cover server-sent payloads. The client routes on `data.type` + `data.rideId`.
 */
const PUSH = Object.freeze({
  NOTIFICATION_CITIES_MAX: 25, // cap a user's opt-in city list
  TOKENS_PER_MULTICAST: 500, // FCM sendEachForMulticast hard cap — chunk above this
  DEVICE_TOKEN_MAX: 4096, // FCM tokens are ~150+ chars; bound generously
  TYPE: 'new_ride', // data.type for client deep-link routing
  CLICK_PATH: '/feed', // where a notification tap opens the app
  NOTIFICATION: Object.freeze({
    bot: Object.freeze({
      title: 'New ride in your city 🚕',
      body: 'Tap to view the route and contact the customer now.',
    }),
    posted: Object.freeze({
      title: 'Verified ride in your city ✅',
      body: 'A verified driver just posted — tap to view and contact.',
    }),
  }),
});

/** Which feed a push originates from — drives both the toggle and the copy. */
const PUSH_SOURCE = Object.freeze({ BOT: 'bot', POSTED: 'posted' });

module.exports = { PUSH, PUSH_SOURCE };

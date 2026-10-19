'use strict';

/**
 * Push notification bounds + copy (Step 15). `notificationCities` (a City-UUID
 * opt-in list on the user) is the targeting key; PUSH_SOURCE discriminates which
 * per-source toggle a new-ride event honours (notifyBotRides / notifyPostedRides).
 *
 * Copy is Hinglish (widest reach for our driver base); per-user locale push is
 * deferred. `body` is the action tail — the push service prepends the ride's actual
 * route ("Amritsar → Delhi · …") when the city names resolve. The client routes on
 * `data.type` + `data.rideId`.
 */
const PUSH = Object.freeze({
  NOTIFICATION_CITIES_MAX: 25, // cap a user's opt-in city list
  TOKENS_PER_MULTICAST: 500, // FCM sendEachForMulticast hard cap — chunk above this
  DEVICE_TOKEN_MAX: 4096, // FCM tokens are ~150+ chars; bound generously
  TYPE: 'new_ride', // data.type for client deep-link routing
  CLICK_PATH: '/feed', // where a notification tap opens the app
  NOTIFICATION: Object.freeze({
    bot: Object.freeze({
      title: '🚕 Nayi duty available!',
      body: 'Abhi route dekho aur customer se turant baat karo.',
    }),
    posted: Object.freeze({
      title: '✅ Verified ride mili!',
      body: 'Verified driver ne abhi post ki — tap karke dekho aur contact karo.',
    }),
  }),
});

/** Which feed a push originates from — drives both the toggle and the copy. */
const PUSH_SOURCE = Object.freeze({ BOT: 'bot', POSTED: 'posted' });

/**
 * Renewal reminder push (Phase 21.3). One push per paid period, sent in IST daytime only,
 * at the first sweep inside LEAD_HOURS of expiry — so every expiry gets ~1 day's notice
 * without a 3am alert. A renewal stacks expiresAt forward, which drops the user out of
 * the window AND changes the dedupe key, so renewed users are skipped automatically.
 */
const RENEWAL_REMINDER = Object.freeze({
  SWEEP_INTERVAL_MS: 15 * 60 * 1000,
  LEAD_HOURS: 36,
  SEND_HOUR_START_IST: 9, // inclusive
  SEND_HOUR_END_IST: 21, // exclusive
  DEDUPE_TTL_SEC: 3 * 24 * 60 * 60, // outlives LEAD_HOURS
  DEDUPE_KEY_PREFIX: 'easecab:push:renewal:',
  TYPE: 'renewal',
  SOURCE: 'renewal', // the service worker collapses by `ride-${source}`
  CLICK_PATH: '/membership',
  ACTION: 'Renew',
  TITLE: '⏰ Membership khatam hone wali hai',
  BODY: 'Aapki membership {date} ko khatam ho rahi hai. Renew karo aur rides contact karte raho.',
});

module.exports = { PUSH, PUSH_SOURCE, RENEWAL_REMINDER };

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
      title: '🚕 Nayi ride aa gayi!',
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

module.exports = { PUSH, PUSH_SOURCE };

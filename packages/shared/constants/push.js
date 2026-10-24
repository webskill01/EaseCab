'use strict';

/**
 * Push notification bounds + copy (Step 15). `notificationCities` (a City-UUID
 * opt-in list on the user) is the targeting key; PUSH_SOURCE discriminates which
 * per-source toggle a new-ride event honours (notifyBotRides / notifyPostedRides).
 *
 * Copy is Hinglish (widest reach for our driver base); per-user locale push is
 * deferred. Driver-to-driver app: copy never says "customer". Each new ride picks one
 * variant at random so alerts don't read the same every time; {from}/{to}/{route} are
 * filled from the ride's cities, and NO_ROUTE is used when the pickup name is missing.
 * The client routes on `data.type` + `data.rideId`.
 */
const PUSH = Object.freeze({
  NOTIFICATION_CITIES_MAX: 25, // cap a user's opt-in city list
  TOKENS_PER_MULTICAST: 500, // FCM sendEachForMulticast hard cap — chunk above this
  DEVICE_TOKEN_MAX: 4096, // FCM tokens are ~150+ chars; bound generously
  TYPE: 'new_ride', // data.type for client deep-link routing
  CLICK_PATH: '/feed', // where a notification tap opens the app
  NOTIFICATION: Object.freeze({
    bot: Object.freeze([
      { title: '🚕 {from} se nayi duty', body: '{route} · Pehle call karne wale driver ko milti hai — abhi dekho' },
      { title: '🔥 Fresh duty: {route}', body: 'Abhi abhi aayi hai. Jaldi call karo, duty haath se na jaaye' },
      { title: '📍 {from} mein duty khaali', body: '{route} · Driver bhai ko gaadi chahiye, tap karke dekho' },
      { title: '⚡ Nayi duty aayi — {route}', body: 'Late mat karo, fresh duties minto mein book ho jaati hain' },
      { title: '💰 Kamai ka mauka: {route}', body: 'Nayi duty available hai — abhi kholo aur seedha baat karo' },
      { title: '🛣️ {route} duty', body: 'Fresh hai, khaali hai. Sabse pehle tum call karo' },
      { title: '🚖 {from} ki duty, abhi abhi', body: '{route} · Detail dekho, driver se turant baat karo' },
    ].map(Object.freeze)),
    posted: Object.freeze([
      { title: '✅ Verified duty: {route}', body: 'Verified driver ne abhi post ki — tap karke dekho' },
      { title: '🛡️ Bharosemand duty — {route}', body: 'Verified driver ki duty, seedha baat karo' },
      { title: '✅ {from} se verified duty', body: '{route} · Pehle aao, pehle pao' },
      { title: '⭐ Nayi verified duty: {route}', body: 'Fresh post hai — abhi dekho, baad mein late ho jaoge' },
    ].map(Object.freeze)),
  }),
  NO_ROUTE: Object.freeze({
    bot: Object.freeze({ title: '🚕 Nayi duty available!', body: 'Abhi dekho aur driver se turant baat karo' }),
    posted: Object.freeze({ title: '✅ Verified duty mili!', body: 'Verified driver ne abhi post ki — tap karke dekho' }),
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

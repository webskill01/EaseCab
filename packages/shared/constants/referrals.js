'use strict';

/**
 * Referral program (Phase 22). Mirrors the WhatsApp-group offer drivers already know:
 * every 2 referred drivers who PAY earn the referrer one free month. A referee names
 * their referrer by mobile number within CLAIM_WINDOW_DAYS of signing up.
 */
const REFERRAL = Object.freeze({
  PER_REWARD: 2, // paid referees per free month
  CLAIM_WINDOW_DAYS: 7,
  LIST_LIMIT: 100, // ponytail: no pagination — top referrer has 7; add a cursor past 100
  ADMIN_PAGE_SIZE: 20, // admin list (offset pagination, §8)
  ADMIN_MAX_PAGE_SIZE: 50,
  ADMIN_FILTER: Object.freeze({ ALL: 'all', PAID: 'paid', UNPAID: 'unpaid', REWARDED: 'rewarded' }),
  CLAIM_RATE_LIMIT: Object.freeze({ MAX_PER_WINDOW: 5, WINDOW_SEC: 3600 }), // number-probing cap
  PUSH: Object.freeze({
    TYPE: 'referral',
    SOURCE: 'referral',
    TITLE: '🎉 1 mahina free mila!',
    BODY: 'Aapke 2 dosto ne EaseCab join kiya — membership 30 din badh gayi.',
    CLICK_PATH: '/refer',
    ACTION: 'Dekho',
  }),
});

module.exports = { REFERRAL };

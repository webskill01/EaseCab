'use strict';

const { SUBSCRIPTION_STATUS } = require('../constants/enums');
const { SUBSCRIPTION_PLAN } = require('../constants/subscription');

const DAY_MS = 86_400_000;

/**
 * The soft gate's eligibility rule: contact reveal needs a paid-active membership with an
 * unexpired window (no trial since 2026-10-13, no KYC).
 * @param {{ status: string, expiresAt?: ?Date }|null} sub
 * @param {Date} [now]
 * @returns {boolean}
 */
function isSubscriptionActive(sub, now = new Date()) {
  if (!sub) return false;
  return sub.status === SUBSCRIPTION_STATUS.ACTIVE && Boolean(sub.expiresAt) && sub.expiresAt > now;
}

/**
 * Stacking math for a successful ₹149 payment (spec): the new 30-day window attaches
 * to the LATER of now and the user's current paid expiry (if still active) — so remaining
 * time is never wasted. paidStartedAt is set once, on the first-ever payment.
 * @param {{ status: string, expiresAt?: ?Date, paidStartedAt?: ?Date }|null} sub
 * @param {Date} [now]
 * @returns {{ newExpiresAt: Date, paidStartedAt: Date }}
 */
function computeRenewal(sub, now = new Date()) {
  let baseMs = now.getTime();
  if (sub && sub.status === SUBSCRIPTION_STATUS.ACTIVE && sub.expiresAt && sub.expiresAt > now) {
    baseMs = sub.expiresAt.getTime();
  }
  return {
    newExpiresAt: new Date(baseMs + SUBSCRIPTION_PLAN.PERIOD_DAYS * DAY_MS),
    paidStartedAt: sub && sub.paidStartedAt ? sub.paidStartedAt : now,
  };
}

module.exports = { isSubscriptionActive, computeRenewal };

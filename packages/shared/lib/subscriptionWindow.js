'use strict';

const { SUBSCRIPTION_STATUS } = require('../constants/enums');
const { SUBSCRIPTION_PLAN } = require('../constants/subscription');

const DAY_MS = 86_400_000;

/**
 * The soft gate's eligibility rule (DECISIONS 2026-05-30 "Gate model CONFIRMED" —
 * contact reveal needs an active trial or paid subscription, NO KYC). Active iff in
 * an unexpired trial window, OR paid-active with an unexpired paid window.
 * @param {{ status: string, trialExpiresAt?: Date, expiresAt?: ?Date }|null} sub
 * @param {Date} [now]
 * @returns {boolean}
 */
function isSubscriptionActive(sub, now = new Date()) {
  if (!sub) return false;
  if (sub.status === SUBSCRIPTION_STATUS.ACTIVE) return Boolean(sub.expiresAt) && sub.expiresAt > now;
  if (sub.status === SUBSCRIPTION_STATUS.TRIAL) return Boolean(sub.trialExpiresAt) && sub.trialExpiresAt > now;
  return false; // expired / halted / cancelled
}

/**
 * Stacking math for a successful ₹149 payment (spec): the new 30-day window attaches
 * to the LATER of now and the user's current active-until (paid expiry if active,
 * else trial expiry if still trialing) — so remaining time is never wasted.
 * paidStartedAt is set once, on the first-ever payment.
 * @param {{ status: string, trialExpiresAt?: Date, expiresAt?: ?Date, paidStartedAt?: ?Date }|null} sub
 * @param {Date} [now]
 * @returns {{ newExpiresAt: Date, paidStartedAt: Date }}
 */
function computeRenewal(sub, now = new Date()) {
  let baseMs = now.getTime();
  if (sub) {
    if (sub.status === SUBSCRIPTION_STATUS.ACTIVE && sub.expiresAt && sub.expiresAt > now) {
      baseMs = sub.expiresAt.getTime();
    } else if (sub.status === SUBSCRIPTION_STATUS.TRIAL && sub.trialExpiresAt && sub.trialExpiresAt > now) {
      baseMs = sub.trialExpiresAt.getTime();
    }
  }
  return {
    newExpiresAt: new Date(baseMs + SUBSCRIPTION_PLAN.PERIOD_DAYS * DAY_MS),
    paidStartedAt: sub && sub.paidStartedAt ? sub.paidStartedAt : now,
  };
}

module.exports = { isSubscriptionActive, computeRenewal };

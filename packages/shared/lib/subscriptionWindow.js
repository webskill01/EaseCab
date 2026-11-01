'use strict';

const { SUBSCRIPTION_STATUS } = require('../constants/enums');
const { SUBSCRIPTION_PLAN, SUBSCRIPTION_PLANS } = require('../constants/subscription');

const DAY_MS = 86_400_000;

/** @param {string} id @returns {?{ id: string, months: number, days: number, pricePaise: number }} */
function planById(id) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id) || null;
}

/**
 * Days a captured payment buys. A plan price maps to its plan; any other amount (founder
 * or manual payments) counts as whole monthly periods, minimum one.
 * @param {number} amountPaise
 * @returns {number}
 */
function periodDaysForAmount(amountPaise) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.pricePaise === amountPaise);
  if (plan) return plan.days;
  return Math.max(1, Math.round(amountPaise / SUBSCRIPTION_PLAN.PRICE_PAISE)) * SUBSCRIPTION_PLAN.PERIOD_DAYS;
}

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
 * Stacking math for a successful payment (spec): the new window (`days` long) attaches
 * to the LATER of now and the user's current paid expiry (if still active) — so remaining
 * time is never wasted. paidStartedAt is set once, on the first-ever payment.
 * @param {{ status: string, expiresAt?: ?Date, paidStartedAt?: ?Date }|null} sub
 * @param {Date} [now]
 * @param {number} [days] - window length; defaults to the monthly period
 * @returns {{ newExpiresAt: Date, paidStartedAt: Date }}
 */
function computeRenewal(sub, now = new Date(), days = SUBSCRIPTION_PLAN.PERIOD_DAYS) {
  let baseMs = now.getTime();
  if (sub && sub.status === SUBSCRIPTION_STATUS.ACTIVE && sub.expiresAt && sub.expiresAt > now) {
    baseMs = sub.expiresAt.getTime();
  }
  return {
    newExpiresAt: new Date(baseMs + days * DAY_MS),
    paidStartedAt: sub && sub.paidStartedAt ? sub.paidStartedAt : now,
  };
}

module.exports = { isSubscriptionActive, computeRenewal, planById, periodDaysForAmount };

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { isSubscriptionActive, computeRenewal } = require('../subscriptionWindow');

const DAY = 86_400_000;
const now = new Date('2026-06-02T00:00:00Z');

test('isSubscriptionActive: a legacy trial row is never active', () => {
  assert.strictEqual(isSubscriptionActive({ status: 'trial', expiresAt: null }, now), false);
});

test('isSubscriptionActive: paid window honored; null is false', () => {
  assert.strictEqual(isSubscriptionActive({ status: 'active', expiresAt: new Date(now.getTime() + DAY) }, now), true);
  assert.strictEqual(isSubscriptionActive(null, now), false);
});

test('computeRenewal stacks on remaining paid time (early renewal)', () => {
  const sub = { status: 'active', expiresAt: new Date(now.getTime() + 10 * DAY), paidStartedAt: new Date(now.getTime() - 40 * DAY) };
  const { newExpiresAt, paidStartedAt } = computeRenewal(sub, now);
  assert.strictEqual(newExpiresAt.getTime(), now.getTime() + 40 * DAY); // 10 left + 30
  assert.strictEqual(paidStartedAt.getTime(), sub.paidStartedAt.getTime()); // unchanged
});

test('computeRenewal never stacks on a legacy trial window', () => {
  const sub = { status: 'trial', expiresAt: null, paidStartedAt: null };
  const { newExpiresAt, paidStartedAt } = computeRenewal(sub, now);
  assert.strictEqual(newExpiresAt.getTime(), now.getTime() + 30 * DAY);
  assert.strictEqual(paidStartedAt.getTime(), now.getTime()); // first payment
});

test('computeRenewal from expired = 30d from now', () => {
  const sub = { status: 'expired', expiresAt: new Date(now.getTime() - DAY), paidStartedAt: new Date(now.getTime() - 40 * DAY) };
  const { newExpiresAt } = computeRenewal(sub, now);
  assert.strictEqual(newExpiresAt.getTime(), now.getTime() + 30 * DAY);
});

test('plans: unique prices, monthly plan matches SUBSCRIPTION_PLAN, longer plans are cheaper per month', () => {
  const { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN } = require('../../constants/subscription');
  const prices = SUBSCRIPTION_PLANS.map((p) => p.pricePaise);
  assert.strictEqual(new Set(prices).size, prices.length);
  assert.strictEqual(SUBSCRIPTION_PLANS[0].pricePaise, SUBSCRIPTION_PLAN.PRICE_PAISE);
  assert.strictEqual(SUBSCRIPTION_PLANS[0].days, SUBSCRIPTION_PLAN.PERIOD_DAYS);
  const perMonth = SUBSCRIPTION_PLANS.map((p) => p.pricePaise / p.months);
  perMonth.slice(1).forEach((v, i) => assert.ok(v < perMonth[i]));
});

test('planById + periodDaysForAmount map plans; other amounts count whole months', () => {
  const { planById, periodDaysForAmount } = require('../subscriptionWindow');
  assert.strictEqual(planById('m6').pricePaise, 74900);
  assert.strictEqual(planById('nope'), null);
  assert.strictEqual(periodDaysForAmount(14900), 30);
  assert.strictEqual(periodDaysForAmount(39900), 90);
  assert.strictEqual(periodDaysForAmount(119900), 365);
  assert.strictEqual(periodDaysForAmount(29800), 60); // founder paid 2 × ₹149
  assert.strictEqual(periodDaysForAmount(100), 30); // never less than one month
});

test('computeRenewal stacks a custom-length window on remaining time', () => {
  const { computeRenewal } = require('../subscriptionWindow');
  const now = new Date('2026-11-01T00:00:00Z');
  const sub = { status: 'active', expiresAt: new Date('2026-11-11T00:00:00Z'), paidStartedAt: now };
  const { newExpiresAt } = computeRenewal(sub, now, 365);
  assert.strictEqual(newExpiresAt.toISOString(), '2027-11-11T00:00:00.000Z');
});

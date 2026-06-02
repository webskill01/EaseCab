'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { isSubscriptionActive, computeRenewal } = require('../subscriptionWindow');

const DAY = 86_400_000;
const now = new Date('2026-06-02T00:00:00Z');

test('isSubscriptionActive: trial in-window active, expired trial not', () => {
  assert.strictEqual(isSubscriptionActive({ status: 'trial', trialExpiresAt: new Date(now.getTime() + DAY) }, now), true);
  assert.strictEqual(isSubscriptionActive({ status: 'trial', trialExpiresAt: new Date(now.getTime() - DAY) }, now), false);
});

test('isSubscriptionActive: paid window honored; null is false', () => {
  assert.strictEqual(isSubscriptionActive({ status: 'active', expiresAt: new Date(now.getTime() + DAY) }, now), true);
  assert.strictEqual(isSubscriptionActive(null, now), false);
});

test('computeRenewal stacks on remaining paid time (early renewal)', () => {
  const sub = { status: 'active', expiresAt: new Date(now.getTime() + 10 * DAY), trialExpiresAt: new Date(now.getTime() - DAY), paidStartedAt: new Date(now.getTime() - 40 * DAY) };
  const { newExpiresAt, paidStartedAt } = computeRenewal(sub, now);
  assert.strictEqual(newExpiresAt.getTime(), now.getTime() + 40 * DAY); // 10 left + 30
  assert.strictEqual(paidStartedAt.getTime(), sub.paidStartedAt.getTime()); // unchanged
});

test('computeRenewal stacks on remaining trial time (mid-trial pay)', () => {
  const sub = { status: 'trial', trialExpiresAt: new Date(now.getTime() + 4 * DAY), expiresAt: null, paidStartedAt: null };
  const { newExpiresAt, paidStartedAt } = computeRenewal(sub, now);
  assert.strictEqual(newExpiresAt.getTime(), now.getTime() + 34 * DAY); // 4 trial + 30
  assert.strictEqual(paidStartedAt.getTime(), now.getTime()); // first payment
});

test('computeRenewal from expired = 30d from now', () => {
  const sub = { status: 'expired', expiresAt: new Date(now.getTime() - DAY), trialExpiresAt: new Date(now.getTime() - 40 * DAY), paidStartedAt: new Date(now.getTime() - 40 * DAY) };
  const { newExpiresAt } = computeRenewal(sub, now);
  assert.strictEqual(newExpiresAt.getTime(), now.getTime() + 30 * DAY);
});

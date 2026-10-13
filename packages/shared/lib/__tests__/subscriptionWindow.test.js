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

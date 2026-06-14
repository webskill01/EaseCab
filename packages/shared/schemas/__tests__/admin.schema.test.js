'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  adminReviewActionSchema,
  adminBadgeSchema,
  adminVerificationsQuerySchema,
} = require('../../index');

test('review reject requires a reason', () => {
  assert.equal(adminReviewActionSchema.safeParse({ action: 'reject' }).success, false);
  assert.equal(adminReviewActionSchema.safeParse({ action: 'reject', rejectionReason: 'blurry' }).success, true);
  assert.equal(adminReviewActionSchema.safeParse({ action: 'approve' }).success, true);
});

test('query coerces page/limit with defaults', () => {
  const r = adminVerificationsQuerySchema.parse({});
  assert.equal(r.page, 1);
  assert.equal(r.limit, 20);
});

test('query rejects an over-cap limit', () => {
  assert.equal(adminVerificationsQuerySchema.safeParse({ limit: 999 }).success, false);
});

test('badge accepts only approved/rejected/none', () => {
  assert.equal(adminBadgeSchema.safeParse({ status: 'approved' }).success, true);
  assert.equal(adminBadgeSchema.safeParse({ status: 'none' }).success, true);
  assert.equal(adminBadgeSchema.safeParse({ status: 'submitted' }).success, false);
});

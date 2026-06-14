'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  adminReviewActionSchema,
  adminBadgeSchema,
  adminVerificationsQuerySchema,
  REPORT_ACTION,
  ADMIN_REPORTS,
  adminReportsQuerySchema,
  adminReportActionSchema,
  adminReportIdParamSchema,
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

test('REPORT_ACTION is the frozen {dismiss, remove} verb set', () => {
  assert.ok(Object.isFrozen(REPORT_ACTION));
  assert.deepEqual(Object.values(REPORT_ACTION).sort(), ['dismiss', 'remove']);
});

test('ADMIN_REPORTS exposes frozen offset-pagination tuning', () => {
  assert.ok(Object.isFrozen(ADMIN_REPORTS));
  assert.equal(ADMIN_REPORTS.PAGE_SIZE, 20);
  assert.equal(ADMIN_REPORTS.MAX_PAGE_SIZE, 50);
});

test('adminReportsQuerySchema coerces paging and defaults status=open', () => {
  const parsed = adminReportsQuerySchema.parse({ page: '2', limit: '10' });
  assert.deepEqual(parsed, { page: 2, limit: 10, status: 'open' });
});

test('adminReportsQuerySchema rejects an unknown status', () => {
  assert.equal(adminReportsQuerySchema.safeParse({ status: 'archived' }).success, false);
});

test('adminReportActionSchema accepts dismiss/remove and rejects others', () => {
  assert.equal(adminReportActionSchema.safeParse({ action: 'remove' }).success, true);
  assert.equal(adminReportActionSchema.safeParse({ action: 'delete' }).success, false);
});

test('adminReportIdParamSchema requires a uuid', () => {
  assert.equal(adminReportIdParamSchema.safeParse({ id: 'nope' }).success, false);
});

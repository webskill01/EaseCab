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
  USER_ACTION,
  ADMIN_USERS,
  adminUsersQuerySchema,
  adminUserActionSchema,
  CITY_STRING_ACTION,
  ADMIN_CITY_STRINGS,
  adminCityStringsQuerySchema,
  adminCityStringActionSchema,
  adminCityStringIdParamSchema,
  adminUnresolvedRideActionSchema,
} = require('../../index');

const UUID = '11111111-1111-1111-1111-111111111111';

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

test('USER_ACTION is the frozen {delete, restore} verb set', () => {
  assert.ok(Object.isFrozen(USER_ACTION));
  assert.deepEqual(Object.values(USER_ACTION).sort(), ['delete', 'restore']);
});

test('ADMIN_USERS exposes frozen offset-pagination tuning', () => {
  assert.ok(Object.isFrozen(ADMIN_USERS));
  assert.equal(ADMIN_USERS.PAGE_SIZE, 20);
  assert.equal(ADMIN_USERS.MAX_PAGE_SIZE, 50);
});

test('adminUsersQuerySchema defaults status=active and page/limit', () => {
  assert.deepEqual(adminUsersQuerySchema.parse({}), { page: 1, limit: 20, status: 'active' });
});

test('adminUsersQuerySchema trims q and accepts the status filter', () => {
  const out = adminUsersQuerySchema.parse({ q: '  98765 ', status: 'deleted', page: '2' });
  assert.equal(out.q, '98765');
  assert.equal(out.status, 'deleted');
  assert.equal(out.page, 2);
});

test('adminUsersQuerySchema rejects a bad status', () => {
  assert.equal(adminUsersQuerySchema.safeParse({ status: 'gone' }).success, false);
});

test('adminUserActionSchema accepts delete/restore and rejects others', () => {
  assert.equal(adminUserActionSchema.safeParse({ action: 'delete' }).success, true);
  assert.equal(adminUserActionSchema.safeParse({ action: 'restore' }).success, true);
  assert.equal(adminUserActionSchema.safeParse({ action: 'nuke' }).success, false);
});

test('CITY_STRING_ACTION is the frozen {resolve, dismiss} verb set', () => {
  assert.ok(Object.isFrozen(CITY_STRING_ACTION));
  assert.deepEqual(Object.values(CITY_STRING_ACTION).sort(), ['dismiss', 'resolve']);
});

test('ADMIN_CITY_STRINGS exposes frozen offset-pagination tuning', () => {
  assert.ok(Object.isFrozen(ADMIN_CITY_STRINGS));
  assert.equal(ADMIN_CITY_STRINGS.PAGE_SIZE, 20);
  assert.equal(ADMIN_CITY_STRINGS.MAX_PAGE_SIZE, 50);
});

test('adminCityStringsQuerySchema coerces page/limit with defaults', () => {
  assert.deepEqual(adminCityStringsQuerySchema.parse({ page: '3', limit: '5' }), { page: 3, limit: 5 });
  assert.deepEqual(adminCityStringsQuerySchema.parse({}), { page: 1, limit: 20 });
});

test('adminCityStringsQuerySchema rejects an over-cap limit', () => {
  assert.equal(adminCityStringsQuerySchema.safeParse({ limit: 999 }).success, false);
});

test('adminCityStringActionSchema requires a uuid cityId when resolving', () => {
  assert.equal(adminCityStringActionSchema.safeParse({ action: 'resolve' }).success, false);
  assert.equal(adminCityStringActionSchema.safeParse({ action: 'resolve', cityId: 'nope' }).success, false);
  assert.equal(adminCityStringActionSchema.safeParse({ action: 'resolve', cityId: UUID }).success, true);
});

test('adminCityStringActionSchema accepts dismiss without a cityId and rejects junk actions', () => {
  assert.equal(adminCityStringActionSchema.safeParse({ action: 'dismiss' }).success, true);
  assert.equal(adminCityStringActionSchema.safeParse({ action: 'delete' }).success, false);
});

test('adminUnresolvedRideActionSchema requires side + uuid cityId for set_city, nothing for hide', () => {
  assert.equal(adminUnresolvedRideActionSchema.safeParse({ action: 'set_city' }).success, false);
  assert.equal(adminUnresolvedRideActionSchema.safeParse({ action: 'set_city', side: 'pickup' }).success, false);
  assert.equal(adminUnresolvedRideActionSchema.safeParse({ action: 'set_city', cityId: UUID }).success, false);
  assert.equal(adminUnresolvedRideActionSchema.safeParse({ action: 'set_city', side: 'left', cityId: UUID }).success, false);
  assert.equal(adminUnresolvedRideActionSchema.safeParse({ action: 'set_city', side: 'drop', cityId: UUID }).success, true);
  assert.equal(adminUnresolvedRideActionSchema.safeParse({ action: 'hide' }).success, true);
});

test('adminCityStringIdParamSchema requires a uuid', () => {
  assert.equal(adminCityStringIdParamSchema.safeParse({ id: 'nope' }).success, false);
  assert.equal(adminCityStringIdParamSchema.safeParse({ id: UUID }).success, true);
});

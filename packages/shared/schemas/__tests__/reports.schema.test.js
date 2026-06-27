'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { reportCreateSchema, userReportCreateSchema, REPORT_REASON } = require('../../index');

test('reportCreateSchema accepts a valid reason with optional remarks', () => {
  const r = reportCreateSchema.parse({ reason: 'spam', remarks: '  duplicate post  ' });
  assert.equal(r.reason, 'spam');
  assert.equal(r.remarks, 'duplicate post'); // trimmed
});

test('reportCreateSchema accepts a reason with no remarks', () => {
  const r = reportCreateSchema.parse({ reason: REPORT_REASON.FAKE });
  assert.equal(r.reason, 'fake');
  assert.equal('remarks' in r, false);
});

test('reportCreateSchema rejects an unknown reason', () => {
  assert.throws(() => reportCreateSchema.parse({ reason: 'nonsense' }));
});

test('reportCreateSchema rejects unknown keys (strict)', () => {
  assert.throws(() => reportCreateSchema.parse({ reason: 'other', rideId: 'x' }));
});

test('reportCreateSchema rejects an over-long remark', () => {
  assert.throws(() => reportCreateSchema.parse({ reason: 'other', remarks: 'x'.repeat(501) }));
});

test('userReportCreateSchema accepts reason + optional remarks, trims remark', () => {
  const r = userReportCreateSchema.parse({ reason: REPORT_REASON.FAKE, remarks: '  scammer  ' });
  assert.equal(r.reason, 'fake');
  assert.equal(r.remarks, 'scammer');
});

test('userReportCreateSchema accepts an optional screenshotKey (P13-13 #2)', () => {
  const r = userReportCreateSchema.parse({ reason: 'spam', screenshotKey: '  reports/u/abc.jpg  ' });
  assert.equal(r.screenshotKey, 'reports/u/abc.jpg');
});

test('userReportCreateSchema rejects an unknown key', () => {
  assert.throws(() => userReportCreateSchema.parse({ reason: 'spam', bogus: 1 }));
});

test('userReportCreateSchema rejects an unknown reason', () => {
  assert.throws(() => userReportCreateSchema.parse({ reason: 'nonsense' }));
});

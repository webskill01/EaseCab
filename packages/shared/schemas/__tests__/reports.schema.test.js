'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { reportCreateSchema, REPORT_REASON } = require('../../index');

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

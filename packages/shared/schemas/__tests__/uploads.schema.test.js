'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { uploadPresignSchema } = require('../uploads.schema');

test('accepts a valid purpose + allowed contentType', () => {
  const r = uploadPresignSchema.safeParse({ purpose: 'dp', contentType: 'image/jpeg' });
  assert.equal(r.success, true);
});

test('rejects an unknown purpose', () => {
  const r = uploadPresignSchema.safeParse({ purpose: 'banner', contentType: 'image/jpeg' });
  assert.equal(r.success, false);
});

test('rejects a contentType not allowed for that purpose (pdf on dp)', () => {
  const r = uploadPresignSchema.safeParse({ purpose: 'dp', contentType: 'application/pdf' });
  assert.equal(r.success, false);
  assert.ok(r.error.issues.some((i) => i.path.includes('contentType')));
});

test('allows pdf on a private KYC purpose', () => {
  const r = uploadPresignSchema.safeParse({ purpose: 'rc_image', contentType: 'application/pdf' });
  assert.equal(r.success, true);
});

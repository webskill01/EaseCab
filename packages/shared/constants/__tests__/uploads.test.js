'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UPLOAD_PURPOSE, UPLOAD_TIER, UPLOAD_MIME_EXT, UPLOAD } = require('../uploads');

test('every purpose has tier/keyPrefix/maxBytes/allowedMime', () => {
  for (const policy of Object.values(UPLOAD_PURPOSE)) {
    assert.ok([UPLOAD_TIER.PUBLIC, UPLOAD_TIER.PRIVATE].includes(policy.tier));
    assert.match(policy.keyPrefix, /\/$/);
    assert.ok(policy.maxBytes > 0);
    assert.ok(Array.isArray(policy.allowedMime) && policy.allowedMime.length > 0);
  }
});

test('dp/car are public 5MB images; rc/licence are private 10MB and allow pdf', () => {
  assert.equal(UPLOAD_PURPOSE.dp.tier, UPLOAD_TIER.PUBLIC);
  assert.equal(UPLOAD_PURPOSE.dp.maxBytes, 5 * 1024 * 1024);
  assert.equal(UPLOAD_PURPOSE.rc_image.tier, UPLOAD_TIER.PRIVATE);
  assert.equal(UPLOAD_PURPOSE.licence_image.maxBytes, 10 * 1024 * 1024);
  assert.ok(UPLOAD_PURPOSE.rc_image.allowedMime.includes('application/pdf'));
  assert.ok(!UPLOAD_PURPOSE.dp.allowedMime.includes('application/pdf'));
});

test('report_screenshot is private 5MB images-only (evidence may hold PII)', () => {
  assert.equal(UPLOAD_PURPOSE.report_screenshot.tier, UPLOAD_TIER.PRIVATE);
  assert.equal(UPLOAD_PURPOSE.report_screenshot.maxBytes, 5 * 1024 * 1024);
  assert.ok(!UPLOAD_PURPOSE.report_screenshot.allowedMime.includes('application/pdf'));
});

test('chat_image is public 10MB images-only (rendered via stable URL in Firestore)', () => {
  assert.equal(UPLOAD_PURPOSE.chat_image.tier, UPLOAD_TIER.PUBLIC);
  assert.equal(UPLOAD_PURPOSE.chat_image.maxBytes, 10 * 1024 * 1024);
  assert.ok(!UPLOAD_PURPOSE.chat_image.allowedMime.includes('application/pdf'));
});

test('mime→ext map and frozen table', () => {
  assert.equal(UPLOAD_MIME_EXT['image/jpeg'], 'jpg');
  assert.equal(UPLOAD_MIME_EXT['application/pdf'], 'pdf');
  assert.ok(Object.isFrozen(UPLOAD_PURPOSE));
  assert.ok(UPLOAD.PRESIGN_EXPIRY_SEC > 0);
});

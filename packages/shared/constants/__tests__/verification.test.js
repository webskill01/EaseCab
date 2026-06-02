'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { VERIFICATION_DOC_TYPE, VERIFICATION } = require('../verification');

test('VERIFICATION_DOC_TYPE is frozen with the 3 doc types', () => {
  assert.deepStrictEqual({ ...VERIFICATION_DOC_TYPE }, { AADHAAR: 'aadhaar', DL: 'dl', RC: 'rc' });
  assert.ok(Object.isFrozen(VERIFICATION_DOC_TYPE));
});

test('VERIFICATION rate-limit constants', () => {
  assert.strictEqual(VERIFICATION.AADHAAR_OTP_MAX_PER_HOUR, 3);
  assert.strictEqual(VERIFICATION.AADHAAR_OTP_WINDOW_SEC, 3600);
  assert.ok(Object.isFrozen(VERIFICATION));
});

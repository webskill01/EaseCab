// packages/shared/schemas/__tests__/auth.schema.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { sendOtpSchema, verifyOtpSchema } = require('../auth.schema');

test('sendOtpSchema accepts a valid Indian E.164 phone', () => {
  const r = sendOtpSchema.safeParse({ phone: '+919876543210' });
  assert.strictEqual(r.success, true);
  assert.strictEqual(r.data.phone, '+919876543210');
});

test('sendOtpSchema rejects bad phones and strips unknown keys', () => {
  assert.strictEqual(sendOtpSchema.safeParse({ phone: '9876543210' }).success, false); // no +91
  assert.strictEqual(sendOtpSchema.safeParse({ phone: '+915876543210' }).success, false); // starts 5
  assert.strictEqual(sendOtpSchema.safeParse({ phone: '+9198765' }).success, false); // too short
  const ok = sendOtpSchema.safeParse({ phone: '+919876543210', evil: 1 });
  assert.strictEqual(ok.success, true);
  assert.strictEqual('evil' in ok.data, false); // unknown keys stripped
});

test('verifyOtpSchema requires a non-trivial idToken string', () => {
  assert.strictEqual(verifyOtpSchema.safeParse({ idToken: 'x'.repeat(20) }).success, true);
  assert.strictEqual(verifyOtpSchema.safeParse({ idToken: '' }).success, false);
  assert.strictEqual(verifyOtpSchema.safeParse({}).success, false);
});

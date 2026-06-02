'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  aadhaarOtpSchema, aadhaarVerifySchema, dlSchema, rcSchema,
} = require('../verification.schema');

test('aadhaarOtpSchema accepts 12 digits, rejects others', () => {
  assert.ok(aadhaarOtpSchema.safeParse({ aadhaarNumber: '123456789012' }).success);
  assert.ok(!aadhaarOtpSchema.safeParse({ aadhaarNumber: '12345' }).success);
  assert.ok(!aadhaarOtpSchema.safeParse({ aadhaarNumber: '12345678901a' }).success);
});

test('aadhaarVerifySchema needs clientId + 6-digit otp', () => {
  assert.ok(aadhaarVerifySchema.safeParse({ clientId: 'c1', otp: '123456' }).success);
  assert.ok(!aadhaarVerifySchema.safeParse({ clientId: 'c1', otp: '12' }).success);
  assert.ok(!aadhaarVerifySchema.safeParse({ clientId: '', otp: '123456' }).success);
});

test('dlSchema needs dlNumber + ISO dob; rcSchema needs rcNumber', () => {
  assert.ok(dlSchema.safeParse({ dlNumber: 'PB1020200012345', dob: '1990-05-20' }).success);
  assert.ok(!dlSchema.safeParse({ dlNumber: 'PB10', dob: '20-05-1990' }).success);
  assert.ok(rcSchema.safeParse({ rcNumber: 'PB10AB1234' }).success);
  assert.ok(!rcSchema.safeParse({ rcNumber: 'x' }).success);
});

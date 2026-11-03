'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { adminWaSessionUpdateSchema, waPairStartSchema, waPairTokenParamSchema } = require('..');

test('update needs at least one field', () => {
  assert.equal(adminWaSessionUpdateSchema.safeParse({}).success, false);
  assert.equal(adminWaSessionUpdateSchema.safeParse({ enabled: false }).success, true);
});

test('pair phone: strips formatting, adds 91 to a 10-digit number, rejects junk', () => {
  assert.equal(waPairStartSchema.parse({ phone: '98765 43210' }).phone, '919876543210');
  assert.equal(waPairStartSchema.parse({ phone: '+91-98765-43210' }).phone, '919876543210');
  assert.equal(waPairStartSchema.parse({}).phone, undefined);
  assert.equal(waPairStartSchema.safeParse({ phone: '12345' }).success, false);
});

test('share token must be base64url of sane length', () => {
  assert.equal(waPairTokenParamSchema.safeParse({ token: 'a'.repeat(32) }).success, true);
  assert.equal(waPairTokenParamSchema.safeParse({ token: '../etc/passwd' }).success, false);
});

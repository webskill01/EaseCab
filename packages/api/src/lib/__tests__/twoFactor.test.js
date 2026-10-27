'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { createTwoFactorClient } = require('../twoFactor');

test('sendOtp puts the same 6-digit code in the path and var1 (WebOTP "#code" slot)', async (t) => {
  let url;
  t.mock.method(global, 'fetch', async (u) => {
    url = u;
    return { status: 200, json: async () => ({ Status: 'Success', Details: 'sess-1' }) };
  });
  const client = createTwoFactorClient({ apiKey: 'k', template: 'easecab_login_otp_txn_auto' });
  assert.strictEqual(await client.sendOtp('+916283380110'), 'sess-1');
  const m = url.match(/\/SMS\/\+916283380110\/(\d{6})\/easecab_login_otp_txn_auto\?var1=(\d{6})$/);
  assert.ok(m, url.replace('/k/', '/***/'));
  assert.strictEqual(m[1], m[2]);
});

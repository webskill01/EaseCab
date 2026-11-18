'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractInviteCodes } = require('../waInvites');

test('extractInviteCodes: dedups codes, ignores non-group links and empty input', () => {
  const a = 'Fa8xYz1234567890ABCDEf';
  const text = `join https://chat.whatsapp.com/${a} again chat.whatsapp.com/invite/${a}
    insta https://instagram.com/x chat.whatsapp.com/channel/0029VaXyz short chat.whatsapp.com/abc`;
  assert.deepEqual(extractInviteCodes(text), [a]);
  assert.deepEqual(extractInviteCodes(undefined), []);
});

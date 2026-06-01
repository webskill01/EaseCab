'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { decideOnClose } = require('../failoverPolicy');

const LOGGED_OUT = 401; // DisconnectReason.loggedOut — passed in, no Baileys import here

test('definitive logout -> rotate + ban (regardless of attempt count)', () => {
  const d = decideOnClose({ code: LOGGED_OUT, attempt: 1, maxAttempts: 5, loggedOutCode: LOGGED_OUT });
  assert.deepEqual(d, { action: 'rotate', ban: true, degrade: false });
});

test('transient close below max attempts -> reconnect same slot', () => {
  const d = decideOnClose({ code: 515, attempt: 2, maxAttempts: 5, loggedOutCode: LOGGED_OUT });
  assert.deepEqual(d, { action: 'reconnect', ban: false, degrade: false });
});

test('transient close at max attempts -> rotate + degrade (boundary)', () => {
  const d = decideOnClose({ code: 515, attempt: 5, maxAttempts: 5, loggedOutCode: LOGGED_OUT });
  assert.deepEqual(d, { action: 'rotate', ban: false, degrade: true });
});

test('transient close beyond max attempts -> rotate + degrade', () => {
  const d = decideOnClose({ code: 408, attempt: 9, maxAttempts: 5, loggedOutCode: LOGGED_OUT });
  assert.deepEqual(d, { action: 'rotate', ban: false, degrade: true });
});

test('undefined code (not a logout) is treated as transient', () => {
  const d = decideOnClose({ code: undefined, attempt: 1, maxAttempts: 5, loggedOutCode: LOGGED_OUT });
  assert.deepEqual(d, { action: 'reconnect', ban: false, degrade: false });
});

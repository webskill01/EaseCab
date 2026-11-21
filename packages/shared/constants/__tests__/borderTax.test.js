'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { BORDER_TAX, BORDER_TAX_KEYS: K, BORDER_TAX_FREE_PUSH, BORDER_TAX_UP_PUSH } = require('../index');

test('BORDER_TAX_KEYS: per-id/per-site keys are distinct and carry their id', () => {
  const keys = [K.waitUp('HR'), K.job('b1'), K.answer('b1'), K.handoff('b1'), K.unlock('b1')];
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys[0].endsWith('HR') && keys.slice(1).every((k) => k.endsWith('b1')));
  assert.notEqual(K.waitUp(BORDER_TAX.PORTAL_KEY), K.waitUp('HR'));
});

test('site-up / vehicle-free pushes open the border tax screen', () => {
  for (const p of [BORDER_TAX_FREE_PUSH, BORDER_TAX_UP_PUSH]) assert.equal(p.CLICK_PATH, '/seva/border-tax');
  assert.ok(BORDER_TAX_UP_PUSH.BODY.includes('{site}') && BORDER_TAX_FREE_PUSH.BODY.includes('{vehicle}'));
});

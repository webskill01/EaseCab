'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractPhone } = require('../extractPhone');

test('extractPhone pulls a 10-digit mobile from common formats', () => {
  assert.equal(extractPhone('call 9876543210 now'), '9876543210');
  assert.equal(extractPhone('+91 98765 43210'), '9876543210');
  assert.equal(extractPhone('98765-43210'), '9876543210');
});

test('extractPhone returns null when no mobile present', () => {
  assert.equal(extractPhone('Delhi to Chandigarh sector 17'), null);
  assert.equal(extractPhone(''), null);
});

test('extractPhone skips short numbers, returns first valid mobile', () => {
  assert.equal(extractPhone('ID 2728832 rate 4000 contact 9253074890'), '9253074890');
});

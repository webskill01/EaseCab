'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { extractPhone } = require('../extractPhone');
const { maskPhone } = require('../maskPhone');
const { messages } = require('./fixtures/messages');

test('extractPhone returns 10-digit number from various formats', () => {
  assert.strictEqual(extractPhone('call 9876543210 now'), '9876543210');
  assert.strictEqual(extractPhone('+91 98765 43210'), '9876543210');
  assert.strictEqual(extractPhone('98765-43210'), '9876543210');
});

test('extractPhone returns null when no phone', () => {
  assert.strictEqual(extractPhone('Delhi to Chandigarh sector 17'), null);
});

test('extractPhone ignores short numbers and returns the first valid mobile', () => {
  assert.strictEqual(extractPhone('Booking ID 2728832 rate 4000 contact 9253074890'), '9253074890');
});

test('maskPhone replaces all phone occurrences with block char', () => {
  const masked = maskPhone('Delhi to Chd 9876543210', '9876543210');
  assert.ok(!masked.includes('9876543210'));
  assert.ok(masked.includes('█'));
});

test('maskPhone masks separated forms too', () => {
  const masked = maskPhone('Pick Shimla 98555 11114 call', '9855511114');
  assert.ok(!/\d{5}\s?\d{5}/.test(masked));
  assert.ok(masked.includes('█'));
});

// Data-driven: every accepted real fixture must yield its expected primary phone.
for (const m of messages.filter((x) => x.isRide)) {
  test(`fixture #${m.id}: phone=${m.phone}`, () => {
    assert.strictEqual(extractPhone(m.text), m.phone, `phone for #${m.id}`);
  });
}

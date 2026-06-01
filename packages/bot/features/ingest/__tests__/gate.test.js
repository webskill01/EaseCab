'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { isRideMessage } = require('../isRideMessage');
const { containsBlockedNumber, isBlockedSender } = require('../blocklist');

const CFG = { rideKeywords: ['to', 'drop', 'cab', 'innova'], ignoreKeywords: ['good morning', 'khali', 'free'] };

test('accepts a ride-like message', () => {
  assert.strictEqual(isRideMessage('Delhi to Chandigarh innova', CFG), true);
});
test('rejects greeting / ignore keyword', () => {
  assert.strictEqual(isRideMessage('good morning all', CFG), false);
  assert.strictEqual(isRideMessage('khali aa raha hai', CFG), false);
});
test('rejects message with no keyword/route', () => {
  assert.strictEqual(isRideMessage('thanks bhai', CFG), false);
});
test('containsBlockedNumber matches with/without country code', () => {
  assert.strictEqual(containsBlockedNumber('call 9876543210', ['9876543210']), true);
  assert.strictEqual(containsBlockedNumber('call 919876543210', ['9876543210']), true);
  assert.strictEqual(containsBlockedNumber('call 9000000000', ['9876543210']), false);
});
test('containsBlockedNumber matches blocked numbers written in Unicode digits (no bypass)', () => {
  // Arabic-Indic ٩٨٧٦٥٤٣٢١٠ and Devanagari ९८७६५४३२१० both == 9876543210
  assert.strictEqual(containsBlockedNumber('call ٩٨٧٦٥٤٣٢١٠', ['9876543210']), true);
  assert.strictEqual(containsBlockedNumber('call ९८७६५४३२१०', ['9876543210']), true);
  // full-width ９８７６ mixed with ASCII still normalizes
  assert.strictEqual(containsBlockedNumber('call ９８７６543210', ['9876543210']), true);
});
test('isBlockedSender normalizes Unicode digits in a JID', () => {
  assert.strictEqual(isBlockedSender('91٩٨٧٦٥٤٣٢١٠@s.whatsapp.net', ['9876543210']), true);
});
test('isBlockedSender matches JID last 10 digits', () => {
  assert.strictEqual(isBlockedSender('919876543210@s.whatsapp.net', ['9876543210']), true);
  assert.strictEqual(isBlockedSender('911111111111@s.whatsapp.net', ['9876543210']), false);
});

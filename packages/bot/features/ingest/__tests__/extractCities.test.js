'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { extractCities } = require('../extractCities');
const { messages } = require('./fixtures/messages');

const CITIES = ['Delhi', 'Chandigarh', 'Amritsar', 'Mohali', 'Patiala', 'Ludhiana'];

// Vocabulary simulating the DB-loaded city list (canonical names + aliases /
// common misspellings present in the real fixtures). extractCities returns the
// raw matched fragment; resolve() maps it to a canonical id downstream.
const TEST_VOCAB = [
  'shimla', 'delhi', 'dehli', 'dehradun', 'manali', 'nainital', 'nanital',
  'jibi', 'jibhi', 'gurgaon', 'gurugram', 'chandigarh', 'palampur', 'panchkula',
  'kasol', 'kharar', 'bhuntar', 'kullu', 'ludhiana', 'tonk', 'banjar', 'mohali',
  'noida', 'zirakpur', 'zrkpur', 'barwala', 'firozpur', 'nawanshahr', 'rishikesh',
  'chakrata', 'sangrur', 'sirsa', 'patiala', 'dabwali', 'rania', 'amritsar',
];

test('"X to Y" → pickup X, drop Y', () => {
  const r = extractCities('Delhi to Chandigarh kal subah', CITIES);
  assert.strictEqual(r.pickup, 'Delhi');
  assert.strictEqual(r.drop, 'Chandigarh');
});

test('"from X to Y"', () => {
  const r = extractCities('Need cab from Mohali to Amritsar', CITIES);
  assert.strictEqual(r.pickup, 'Mohali');
  assert.strictEqual(r.drop, 'Amritsar');
});

test('no city → nulls', () => {
  const r = extractCities('hello bhai kaise ho', CITIES);
  assert.strictEqual(r.pickup, null);
  assert.strictEqual(r.drop, null);
});

// Data-driven: every accepted real fixture must yield the expected pickup/drop
// raw fragments. Rejects are not asserted here (the isRideMessage gate, T6,
// filters them before extraction).
for (const m of messages.filter((x) => x.isRide)) {
  test(`fixture #${m.id}: pickup=${m.pickup} drop=${m.drop}`, () => {
    const r = extractCities(m.text, TEST_VOCAB);
    assert.strictEqual(r.pickup, m.pickup, `pickup for #${m.id}`);
    assert.strictEqual(r.drop, m.drop, `drop for #${m.id}`);
  });
}

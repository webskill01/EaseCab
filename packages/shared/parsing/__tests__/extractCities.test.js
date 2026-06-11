'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractCities, normalizeText } = require('../extractCities');

const VOCAB = ['Delhi', 'Chandigarh', 'Mohali', 'Amritsar', 'Ludhiana', 'Manali'];

test('extractCities reads "X to Y" direction', () => {
  const r = extractCities('Delhi to Chandigarh kal subah', VOCAB);
  assert.equal(r.pickup, 'Delhi');
  assert.equal(r.drop, 'Chandigarh');
});

test('extractCities reads "from X to Y"', () => {
  const r = extractCities('Need cab from Mohali to Amritsar', VOCAB);
  assert.equal(r.pickup, 'Mohali');
  assert.equal(r.drop, 'Amritsar');
});

test('extractCities reads "Y drop X" reversal', () => {
  const r = extractCities('Manali drop Ludhiana', VOCAB);
  assert.equal(r.pickup, 'Ludhiana');
  assert.equal(r.drop, 'Manali');
});

test('extractCities returns nulls on no route', () => {
  const r = extractCities('hello bhai kaise ho', VOCAB);
  assert.equal(r.pickup, null);
  assert.equal(r.drop, null);
});

test('normalizeText folds markup + lowercases', () => {
  assert.equal(normalizeText('*Delhi*  to   Chandigarh'), 'delhi to chandigarh');
});

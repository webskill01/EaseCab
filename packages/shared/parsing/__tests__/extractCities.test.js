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

// Unknown place text (misspellings, unlisted towns) on a matched route side is kept
// as cleaned raw text so CityResolver → UnresolvedCityString → Gemini sweep can map it.
const RAW_VOCAB = [...VOCAB, 'Kasauli'];

test('misspelled pickup is kept raw, known drop resolves as before', () => {
  const r = extractCities('chandighar to delhi', RAW_VOCAB);
  assert.equal(r.pickup, 'chandighar');
  assert.equal(r.drop, 'Delhi');
});

test('both sides unknown: noise words stripped, raw text kept', () => {
  const r = extractCities('need sedan hardiwar to ajitwal drop 6 pm', RAW_VOCAB);
  assert.equal(r.pickup, 'hardiwar');
  assert.equal(r.drop, 'ajitwal');
});

test('unlisted town stays raw — never fuzzed to a near vocab word', () => {
  const r = extractCities('kasol to delhi drop current', RAW_VOCAB);
  assert.equal(r.pickup, 'kasol');
  assert.equal(r.drop, 'Delhi');
});

test('vehicle/time-only text yields no raw city', () => {
  const r = extractCities('need innova 4 pm', RAW_VOCAB);
  assert.equal(r.pickup, null);
  assert.equal(r.drop, null);
  const r2 = extractCities('need innova to go 6 oct 4 pm', RAW_VOCAB);
  assert.equal(r2.pickup, null);
  assert.equal(r2.drop, null);
});

test('misspelled vehicles and state codes are noise in raw text', () => {
  assert.equal(extractCities('sadan kasol to delhi', RAW_VOCAB).pickup, 'kasol');
  assert.equal(extractCities('dizer zirkhpur to delhi', RAW_VOCAB).pickup, 'zirkhpur');
  assert.equal(extractCities('jibhi hp to delhi', RAW_VOCAB).pickup, 'jibhi');
  assert.equal(extractCities('wc kasol to delhi', RAW_VOCAB).pickup, 'kasol');
});

test('live-queue noise (vehicle typos, fillers, states, stations) is stripped from raw text', () => {
  assert.equal(extractCities('Need Ertika ferzpur to jammu drop', RAW_VOCAB).pickup, 'ferzpur');
  assert.equal(extractCities('is going kasol to delhi', RAW_VOCAB).pickup, 'kasol');
  assert.equal(extractCities('delhi to bhvanagar airport', RAW_VOCAB).drop, 'bhvanagar');
  assert.equal(extractCities('uchana haryana to delhi', RAW_VOCAB).pickup, 'uchana');
  assert.equal(extractCities('delhi to jhasi realiway station', RAW_VOCAB).drop, 'jhasi');
});

test('leading "DROP" is the trip type: two cities after it are pickup → drop', () => {
  // Live 2026-10-19: "*DROP* Chandigarh tTO Ludhiana" was saved as drop=Chandigarh, no pickup.
  const r = extractCities('*DROP* Chandigarh tTO Ludhiana *DZIRE ETIOS* *current *CALL ME* sanju patiala', VOCAB);
  assert.equal(r.pickup, 'Chandigarh');
  assert.equal(r.drop, 'Ludhiana');
});

test('"drop: X" with a single city still reads as the drop', () => {
  const r = extractCities('drop: Chandigarh', VOCAB);
  assert.equal(r.pickup, null);
  assert.equal(r.drop, 'Chandigarh');
});

// Live misreads 2026-10-24: numbered stand alias was cut off ("Stand"); vehicle typo
// "crista" was kept as part of the drop.
test('extractCities keeps a leading number on the pickup ("43 bus stand")', () => {
  const r = extractCities('SEDAN W/C NEAT CLEAN 43 bus stand to kasauli CRUNNT RATE:1800', [...RAW_VOCAB, '43 bus stand']);
  assert.equal(r.pickup, '43 bus stand');
  assert.equal(r.drop, 'Kasauli');
});

test('extractCities drops vehicle typo "crista" from a raw drop', () => {
  const r = extractCities('REQUIRED REQUIRED JAIPUR TO PUSKER CRISTA 8.00AM SAMPAT KUMAR', ['Jaipur']);
  assert.equal(r.pickup, 'Jaipur');
  assert.equal(r.drop, 'pusker');
});

test('extractCities never keeps "stand" as a raw place', () => {
  const r = extractCities('bus stand to kasauli', RAW_VOCAB);
  assert.equal(r.pickup, null);
  assert.equal(r.drop, 'Kasauli');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hpclToRows } = require('../build-hpcl');
const { parseJsonl, importRows } = require('../fuel-import');
const { createFuelRepository } = require('../../../src/features/fuel/fuel.repository');

const feature = (stateCode, extra = {}) => ({
  geometry: { coordinates: [76.3869, 30.3398] },
  properties: { name: 'SANDHU FUELS', dealerCode: '41051909', address: 'GT ROAD', city: 'PATIALA', stateCode, cngOutlet: 'No', ...extra },
});

test('hpclToRows: keeps north India, flips [lng,lat], maps cngOutlet, skips bad rows', () => {
  const { rows, skipped } = hpclToRows({ features: [
    feature('PB', { cngOutlet: 'Yes' }), feature('MH'), feature('UK'), feature('HR', { dealerCode: null }),
  ] });
  assert.equal(rows.length, 2);
  assert.equal(skipped, 1);
  assert.deepEqual(rows[0], {
    source: 'hpcl', sourceRef: '41051909', name: 'SANDHU FUELS', brand: 'hpcl', lat: 30.3398, lng: 76.3869,
    address: 'GT ROAD', city: 'PATIALA', stateCode: 'PB', hasCng: true, hasPetrol: true, hasDiesel: true,
  });
  assert.equal(rows[1].hasCng, false);
});

test('parseJsonl: valid rows kept, bad JSON / bad rows reported by line', () => {
  const good = JSON.stringify(hpclToRows({ features: [feature('PB')] }).rows[0]);
  const { rows, bad } = parseJsonl(`${good}\n{nope\n\n${JSON.stringify({ ...JSON.parse(good), source: 'driver' })}\r\n${good}\n`);
  assert.equal(rows.length, 2);
  assert.deepEqual(bad, [2, 4]);
});

test('upsertImported: update never touches status and only turns CNG on', async () => {
  const calls = [];
  const repo = createFuelRepository({ prisma: { fuelStation: { async upsert(a) { calls.push(a); return { id: 'x' }; } } } });
  const [noCng] = hpclToRows({ features: [feature('PB')] }).rows;
  const [cng] = hpclToRows({ features: [feature('PB', { cngOutlet: 'Yes' })] }).rows;
  assert.equal(await importRows(repo, [noCng, cng]), 2);
  assert.deepEqual(calls[0].where, { source_sourceRef: { source: 'hpcl', sourceRef: '41051909' } });
  assert.equal('hasCng' in calls[0].update, false);
  assert.equal(calls[0].create.hasCng, false);
  assert.equal(calls[1].update.hasCng, true);
  for (const c of calls) assert.equal('status' in c.update, false);
});

const { osmToRow, brandOf } = require('../build-osm');

test('osm brandOf: matches brand / operator / name; unknown → other', () => {
  assert.equal(brandOf({ brand: 'Indian Oil' }), 'iocl');
  assert.equal(brandOf({ operator: 'Bharat Petroleum Corporation Limited' }), 'bpcl');
  assert.equal(brandOf({ name: 'Essar Petrol Pump' }), 'nayara');
  assert.equal(brandOf({ name: 'IGL CNG Station' }), 'cgd');
  assert.equal(brandOf({ name: 'HP Petrol Pump' }), 'hpcl');
  assert.equal(brandOf({ name: 'Sandhu Filling Station' }), 'other');
});

test('osmToRow: skips HP (HPCL import has it), handles ways, CGD = CNG only, fuel tags respected', () => {
  assert.equal(osmToRow({ type: 'node', id: 1, lat: 30.3, lon: 76.4, tags: { brand: 'HP' } }, 'PB'), null);
  assert.deepEqual(osmToRow({ type: 'way', id: 2, center: { lat: 30.3, lon: 76.4 }, tags: { brand: 'Indian Oil' } }, 'PB'), {
    source: 'osm', sourceRef: 'way/2', name: 'Indian Oil', brand: 'iocl', lat: 30.3, lng: 76.4,
    address: null, city: null, stateCode: 'PB', hasCng: false, hasPetrol: true, hasDiesel: true,
  });
  const cgd = osmToRow({ type: 'node', id: 3, lat: 28.6, lon: 77.2, tags: { name: 'IGL CNG Station' } }, 'DL');
  assert.deepEqual([cgd.hasCng, cgd.hasPetrol, cgd.hasDiesel], [true, false, false]);
  const tagged = osmToRow({ type: 'node', id: 4, lat: 28.6, lon: 77.2, tags: { name: 'Jio-bp', 'fuel:diesel': 'yes', 'fuel:cng': 'yes' } }, 'DL');
  assert.deepEqual([tagged.hasCng, tagged.hasPetrol, tagged.hasDiesel], [true, false, true]);
  assert.equal(osmToRow({ type: 'node', id: 5, lat: 30.3, lon: 76.4, tags: {} }, 'PB'), null); // no name, no brand
});

const { csvToRows } = require('../build-csv');

test('csvToRows: header in any order, quoted commas, fuels joined by +, bad lines reported', () => {
  const csv = '﻿name,source,ref,brand,lat,lng,fuels,address,city,state\r\n'
    + 'IGL CNG Kirti Nagar,cgd,IGL-101,cgd,28.6517,77.1430,cng,"Najafgarh Rd, Kirti Nagar",Delhi,dl\r\n'
    + 'Bad row,cgd,IGL-102,cgd,0,0,cng,,,\r\n'
    + '\r\n'
    + 'Gill BPCL,cgd,X-1,bpcl,30.3,76.4,petrol+Diesel,,Patiala,PB\n';
  const { rows, bad } = csvToRows(csv);
  assert.deepEqual(bad, [3]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    source: 'cgd', sourceRef: 'IGL-101', name: 'IGL CNG Kirti Nagar', brand: 'cgd', lat: 28.6517, lng: 77.143,
    address: 'Najafgarh Rd, Kirti Nagar', city: 'Delhi', stateCode: 'DL', hasCng: true, hasPetrol: false, hasDiesel: false,
  });
  assert.deepEqual([rows[1].hasPetrol, rows[1].hasDiesel, rows[1].hasCng], [true, true, false]);
});

const { ioclToRows } = require('../build-iocl');
const { findDupes } = require('../dedupe-osm');

test('ioclToRows: north India only, no dealer phone/name, 0,0 coords skipped', () => {
  const head = 'RO Code|Petrol Pump Name|Address|Dealer|Contact No|a|b|c|d|e|f|g|h|District|State|SO|DO|SA|SO No|Latitude|Longitude\n';
  const row = (code, state, lat, lng) => `${code}|SANDHU FUELS|GT  ROAD|Mr X|9999999999|1|2|3|4|5|6|7|8|PATIALA|${state}|a|b|c|9|${lat}|${lng}`;
  const { rows, skipped } = ioclToRows(head + [row('1', 'Punjab', 30.3, 76.4), row('2', 'Kerala', 10, 76), row('3', 'Punjab', 0, 0)].join('\n'));
  assert.equal(skipped, 1);
  assert.deepEqual(rows, [{
    source: 'iocl', sourceRef: '1', name: 'SANDHU FUELS', brand: 'iocl', lat: 30.3, lng: 76.4,
    address: 'GT ROAD', city: 'Patiala', stateCode: 'PB', hasCng: false, hasPetrol: true, hasDiesel: true,
  }]);
  assert.equal(JSON.stringify(rows).includes('9999999999'), false);
});

test('findDupes: same brand within 150 m only, across grid cells', () => {
  const official = [{ id: 'i1', brand: 'iocl', lat: 30.0, lng: 76.0 }];
  const osm = [
    { id: 'o1', brand: 'iocl', lat: 29.9995, lng: 75.9995 }, // ~70 m, neighbouring cell
    { id: 'o2', brand: 'iocl', lat: 30.003, lng: 76.0 }, // ~330 m
    { id: 'o3', brand: 'bpcl', lat: 30.0, lng: 76.0 }, // other brand
  ];
  assert.deepEqual(findDupes(osm, official).map((d) => [d.osm.id, d.official.id]), [['o1', 'i1']]);
});

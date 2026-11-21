'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  fuelNearbyQuerySchema, fuelStationCreateSchema, fuelReportCreateSchema, adminFuelStationPatchSchema, fuelImportRowSchema, fuelRouteQuerySchema,
} = require('../fuel.schema');

test('nearby: coerces query strings, defaults to CNG / 15 km, rejects outside India', () => {
  assert.deepEqual(fuelNearbyQuerySchema.parse({ lat: '30.34', lng: '76.39' }), { lat: 30.34, lng: 76.39, fuel: 'cng', radiusKm: 15 });
  assert.equal(fuelNearbyQuerySchema.safeParse({ lat: '51.5', lng: '-0.1' }).success, false);
  assert.equal(fuelNearbyQuerySchema.safeParse({ lat: '30', lng: '76', radiusKm: '80' }).success, false);
  assert.equal(fuelNearbyQuerySchema.safeParse({ lat: '30', lng: '76', fuel: 'lpg' }).success, false);
});

test('driver add: needs a name and 1+ fuels; brand defaults to other; no extra keys', () => {
  const ok = fuelStationCreateSchema.parse({ name: ' Gill Fuels ', lat: 30.3, lng: 76.4, fuels: ['cng'] });
  assert.equal(ok.name, 'Gill Fuels');
  assert.equal(ok.brand, 'other');
  assert.equal(fuelStationCreateSchema.safeParse({ name: 'X', lat: 30.3, lng: 76.4, fuels: ['cng'] }).success, false);
  assert.equal(fuelStationCreateSchema.safeParse({ name: 'Gill', lat: 30.3, lng: 76.4, fuels: [] }).success, false);
  assert.equal(fuelStationCreateSchema.safeParse({ name: 'Gill', lat: 30.3, lng: 76.4, fuels: ['cng'], status: 'active' }).success, false);
});

test('report + admin patch: known kinds / statuses only', () => {
  assert.equal(fuelReportCreateSchema.safeParse({ kind: 'cng_no' }).success, true);
  assert.equal(fuelReportCreateSchema.safeParse({ kind: 'maybe' }).success, false);
  assert.equal(adminFuelStationPatchSchema.safeParse({}).success, true);
  assert.equal(adminFuelStationPatchSchema.safeParse({ status: 'gone' }).success, false);
  assert.equal(adminFuelStationPatchSchema.safeParse({ addedById: 'x' }).success, false);
});

test('import row: oil-company sources only, never "driver"', () => {
  const row = { source: 'hpcl', sourceRef: '41051909', name: 'MSHSD Agarwal', brand: 'hpcl', lat: 30.3, lng: 76.4, address: null, city: 'PATIALA', stateCode: 'PB', hasCng: false, hasPetrol: true, hasDiesel: true };
  assert.equal(fuelImportRowSchema.safeParse(row).success, true);
  assert.equal(fuelImportRowSchema.safeParse({ ...row, source: 'driver' }).success, false);
  assert.equal(fuelImportRowSchema.safeParse({ ...row, lat: 0 }).success, false);
  assert.equal(fuelImportRowSchema.safeParse({ ...row, status: 'active' }).success, false);
});

test('route query: drop city required; pickup is a city OR a position, never both or half', () => {
  const to = '11111111-1111-4111-8111-111111111111';
  const from = '22222222-2222-4222-8222-222222222222';
  assert.equal(fuelRouteQuerySchema.parse({ toCityId: to, fromLat: '30.34', fromLng: '76.39' }).fuel, 'cng');
  assert.equal(fuelRouteQuerySchema.safeParse({ toCityId: to, fromCityId: from }).success, true);
  assert.equal(fuelRouteQuerySchema.safeParse({ toCityId: to }).success, false);
  assert.equal(fuelRouteQuerySchema.safeParse({ toCityId: to, fromLat: 30.3 }).success, false);
  assert.equal(fuelRouteQuerySchema.safeParse({ toCityId: to, fromCityId: from, fromLat: 30.3, fromLng: 76.4 }).success, false);
});

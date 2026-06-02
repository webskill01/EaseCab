'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { postedRideCreateSchema, postedRidesListQuerySchema, postedRideIdParamSchema } = require('../postedRides.schema');

const UUID = '11111111-1111-4111-8111-111111111111';

test('create: accepts a cityId per direction + valid phone', () => {
  const r = postedRideCreateSchema.safeParse({ fromCityId: UUID, toCityId: UUID, phone: '+919876543210' });
  assert.equal(r.success, true);
});

test('create: accepts free-text raw per direction (no cityId)', () => {
  const r = postedRideCreateSchema.safeParse({ fromCityRaw: 'Mohali Phase 7', toCityRaw: 'Naina Devi', phone: '+919876543210' });
  assert.equal(r.success, true);
});

test('create: rejects when a direction has neither id nor raw', () => {
  const r = postedRideCreateSchema.safeParse({ fromCityId: UUID, phone: '+919876543210' });
  assert.equal(r.success, false);
});

test('create: rejects a non-+91 phone and an unknown vehicle', () => {
  assert.equal(postedRideCreateSchema.safeParse({ fromCityRaw: 'a', toCityRaw: 'b', phone: '9876543210' }).success, false);
  assert.equal(postedRideCreateSchema.safeParse({ fromCityRaw: 'a', toCityRaw: 'b', phone: '+919876543210', vehicleType: 'Spaceship' }).success, false);
});

test('create: accepts optional fare/rideDate/rideTime/notes', () => {
  const r = postedRideCreateSchema.safeParse({
    fromCityRaw: 'a', toCityRaw: 'b', phone: '+919876543210',
    vehicleType: 'Innova', fare: 4500, rideDate: '2026-06-10', rideTime: '09:30', notes: 'AC only',
  });
  assert.equal(r.success, true);
});

test('list query: coerces limit, defaults applied, rejects out-of-range (mirrors rides)', () => {
  assert.equal(postedRidesListQuerySchema.parse({}).limit, 20);
  assert.equal(postedRidesListQuerySchema.parse({ limit: '10' }).limit, 10);
  assert.equal(postedRidesListQuerySchema.safeParse({ limit: '999' }).success, false); // above max
  assert.equal(postedRidesListQuerySchema.safeParse({ limit: '0' }).success, false); // below min
});

test('id param: must be a uuid', () => {
  assert.equal(postedRideIdParamSchema.safeParse({ id: UUID }).success, true);
  assert.equal(postedRideIdParamSchema.safeParse({ id: 'nope' }).success, false);
});

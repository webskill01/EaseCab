// packages/api/src/lib/__tests__/cursor.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { encodeCursor, decodeCursor } = require('../cursor');
const { ERROR_CODES } = require('@easecab/shared');

const isValidationError = (err) => err.code === ERROR_CODES.VALIDATION_ERROR;

test('round-trips a Date receivedAt + id', () => {
  const receivedAt = new Date('2026-06-01T10:20:30.000Z');
  const id = '11111111-1111-1111-1111-111111111111';
  const decoded = decodeCursor(encodeCursor({ receivedAt, id }));
  assert.strictEqual(decoded.receivedAt.toISOString(), receivedAt.toISOString());
  assert.strictEqual(decoded.id, id);
});

test('accepts an ISO-string receivedAt at encode time', () => {
  const decoded = decodeCursor(encodeCursor({ receivedAt: '2026-06-01T00:00:00.000Z', id: 'abc' }));
  assert.strictEqual(decoded.receivedAt.toISOString(), '2026-06-01T00:00:00.000Z');
  assert.strictEqual(decoded.id, 'abc');
});

test('rejects garbage that is not valid base64/JSON', () => {
  assert.throws(() => decodeCursor('!!!not-base64-json!!!'), isValidationError);
});

test('rejects well-formed base64 JSON with the wrong shape', () => {
  const bad = Buffer.from(JSON.stringify({ nope: true })).toString('base64url');
  assert.throws(() => decodeCursor(bad), isValidationError);
});

test('rejects an empty id', () => {
  const bad = Buffer.from(JSON.stringify({ r: '2026-06-01T00:00:00.000Z', i: '' })).toString('base64url');
  assert.throws(() => decodeCursor(bad), isValidationError);
});

test('rejects an unparseable date', () => {
  const bad = Buffer.from(JSON.stringify({ r: 'not-a-date', i: 'abc' })).toString('base64url');
  assert.throws(() => decodeCursor(bad), isValidationError);
});
